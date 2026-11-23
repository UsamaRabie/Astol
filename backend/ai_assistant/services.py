import os
import json
import logging
import urllib.request
import urllib.error
from django.conf import settings
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone

from vehicles.models import Vehicle
from drivers.models import Driver, DriverAssignment
from work_permits.models import WorkPermit
from maintenance.models import MaintenanceRecord, MaintenanceType
from parts.models import VehiclePart, PartMovement, PartCatalog
from fuel.models import FuelRecord

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', '')

FLASH_MODELS = [
    'models/gemini-3-flash-preview',
    'models/gemini-3.8-flash',
    'models/gemini-flash-latest',
]

GREETING_WORDS = {
    'مرحبا', 'مرحباً', 'مرحب', 'اهلا', 'أهلا', 'أهلاً', 'اهلين', 'أهلين',
    'السلام عليكم', 'سلام عليكم', 'وعليكم السلام', 'صباح الخير', 'مساء الخير',
    'هاي', 'هلا', 'هلو', 'ازيك', 'عامل ايه', 'كيفك', 'كيف الحال', 'كيف حالك',
    'شكرا', 'شكراً', 'تسلم', 'يعطيك العافية', 'الله يعافيك'
}


def get_live_database_context(query: str = "") -> str:
    """
    Gathers real-time fleet intelligence from the database and returns
    structured context for Gemini Flash to provide exact, factual answers.
    """
    context_sections = []

    # 1. Vehicles Summary
    total_vehicles = Vehicle.objects.count()
    status_counts = Vehicle.objects.values('status').annotate(count=Count('id'))
    status_summary = {s['status']: s['count'] for s in status_counts}
    
    context_sections.append(
        f"### ملخص أسطول المركبات العام:\n"
        f"- إجمالي عدد المركبات: {total_vehicles}\n"
        f"- المركبات المتاحة للتشغيل: {status_summary.get('AVAILABLE', 0)}\n"
        f"- المركبات في رحلات عمل حالية: {status_summary.get('ON_TRIP', 0)}\n"
        f"- المركبات في الصيانة: {status_summary.get('IN_MAINTENANCE', 0)}\n"
        f"- المركبات المتوقفة / خارج الخدمة: {status_summary.get('OUT_OF_SERVICE', 0)}"
    )

    # 2. Trips and Work Permits Stats
    completed_permits = WorkPermit.objects.filter(status='COMPLETED')
    total_trips = completed_permits.count()
    total_km = completed_permits.aggregate(s=Sum('distance_traveled'))['s'] or 0

    top_trip_vehicles = completed_permits.values(
        'vehicle__plate_number', 'vehicle__internal_fleet_number'
    ).annotate(
        trips_count=Count('id'),
        distance=Sum('distance_traveled')
    ).order_by('-trips_count')[:5]

    top_vehicles_trips_str = "\n".join([
        f"  * المركبة {v['vehicle__plate_number']} (#{v['vehicle__internal_fleet_number']}): {v['trips_count']} رحلة | {v['distance'] or 0:,.0f} كم"
        for v in top_trip_vehicles
    ]) or "  * لا توجد بيانات كافية"

    top_drivers_trips = completed_permits.values('driver__full_name').annotate(
        trips_count=Count('id'),
        distance=Sum('distance_traveled')
    ).order_by('-trips_count')[:5]

    top_drivers_trips_str = "\n".join([
        f"  * السائق {d['driver__full_name']}: {d['trips_count']} رحلة | {d['distance'] or 0:,.0f} كم"
        for d in top_drivers_trips
    ]) or "  * لا توجد بيانات كافية"

    context_sections.append(
        f"### إحصائيات الرحلات وأذونات التشغيل:\n"
        f"- إجمالي الرحلات المكتملة: {total_trips}\n"
        f"- إجمالي المسافات المقطوعة: {total_km:,.1f} كم\n"
        f"- أكثر المركبات تنفيذاً للرحلات:\n{top_vehicles_trips_str}\n"
        f"- أكثر السائقين تنفيذاً للرحلات:\n{top_drivers_trips_str}"
    )

    # 3. Fuel Consumption Stats
    fuel_total_liters = FuelRecord.objects.aggregate(s=Sum('quantity'))['s'] or 0
    fuel_total_cost = FuelRecord.objects.aggregate(s=Sum('total_cost'))['s'] or 0

    top_fuel_vehicles = FuelRecord.objects.values(
        'vehicle__plate_number', 'vehicle__internal_fleet_number'
    ).annotate(
        total_liters=Sum('quantity'),
        total_spent=Sum('total_cost'),
        fills_count=Count('id')
    ).order_by('-total_liters')[:5]

    top_fuel_str = "\n".join([
        f"  * المركبة {f['vehicle__plate_number']} (#{f['vehicle__internal_fleet_number']}): {f['total_liters']:,.1f} لتر | بتكلفة {f['total_spent']:,.2f} ريال/جنيه ({f['fills_count']} تموينات)"
        for f in top_fuel_vehicles
    ]) or "  * لا توجد بيانات وقود"

    context_sections.append(
        f"### إحصائيات استهلاك وتكاليف الوقود:\n"
        f"- إجمالي كميات الوقود المستهلكة: {fuel_total_liters:,.1f} لتر\n"
        f"- إجمالي تكلفة الوقود: {fuel_total_cost:,.2f} ريال/جنيه\n"
        f"- أكثر المركبات استهلاكاً للوقود:\n{top_fuel_str}"
    )

    # 4. Maintenance and Repairs
    maint_total_count = MaintenanceRecord.objects.count()
    maint_total_cost = MaintenanceRecord.objects.aggregate(s=Sum('cost'))['s'] or 0

    top_maint_vehicles = MaintenanceRecord.objects.values(
        'vehicle__plate_number', 'vehicle__internal_fleet_number'
    ).annotate(
        total_cost=Sum('cost'),
        ops_count=Count('id')
    ).order_by('-total_cost')[:5]

    top_maint_str = "\n".join([
        f"  * المركبة {m['vehicle__plate_number']} (#{m['vehicle__internal_fleet_number']}): تكلفة {m['total_cost']:,.2f} ريال/جنيه ({m['ops_count']} عمليات صيانة)"
        for m in top_maint_vehicles
    ]) or "  * لا توجد بيانات صيانة"

    recent_maint = MaintenanceRecord.objects.select_related('vehicle', 'maintenance_type').order_by('-maintenance_date')[:6]
    recent_maint_str = "\n".join([
        f"  * {rm.maintenance_date} | {rm.vehicle.plate_number} (#{rm.vehicle.internal_fleet_number}) | {rm.maintenance_type.name} | التكلفة: {rm.cost} | الورشة: {rm.service_provider or 'ورشة داخلية'}"
        for rm in recent_maint
    ]) or "  * لا توجد عمليات صيانة مسجلة"

    context_sections.append(
        f"### إحصائيات الصيانة والإصلاح وتغيير الزيوت:\n"
        f"- إجمالي عمليات الصيانة: {maint_total_count}\n"
        f"- إجمالي تكاليف الصيانة: {maint_total_cost:,.2f} ريال/جنيه\n"
        f"- أكثر المركبات تكلفة في الصيانة:\n{top_maint_str}\n"
        f"- أحدث عمليات الصيانة المنفذة مؤخراً:\n{recent_maint_str}"
    )

    # 5. Spare Parts & Movements (قطع الغيار وحركات الاستبدال)
    overdue_parts = VehiclePart.objects.filter(current_status='OVERDUE').select_related('vehicle', 'part')[:8]
    overdue_parts_str = "\n".join([
        f"  * [حرجة/متأخرة] مركبة {op.vehicle.plate_number} (#{op.vehicle.internal_fleet_number}) -> قطعة: {op.part.name} (المتبقي: {op.next_replacement_km - op.vehicle.current_odometer} كم)"
        for op in overdue_parts
    ]) or "  * لا توجد قطع متأخرة حالياً (حالة الأسطول ممتازة)"

    due_soon_parts = VehiclePart.objects.filter(current_status='DUE_SOON').select_related('vehicle', 'part')[:6]
    due_soon_str = "\n".join([
        f"  * [مستحقة قريباً] مركبة {dp.vehicle.plate_number} (#{dp.vehicle.internal_fleet_number}) -> قطعة: {dp.part.name} (المتبقي: {dp.next_replacement_km - dp.vehicle.current_odometer} كم / {(dp.next_replacement_date - timezone.now().date()).days} يوم)"
        for dp in due_soon_parts
    ]) or "  * لا توجد قطع مستحقة قريباً"

    recent_movements = PartMovement.objects.select_related('vehicle', 'part').order_by('-movement_date', '-created_at')[:6]
    recent_movements_str = "\n".join([
        f"  * {rm.movement_date} | {rm.vehicle.plate_number} | {rm.part.name} | نوع الحركة: {rm.get_movement_type_display()} | عداد: {rm.odometer:,.0f} كم | المسافة المخدومة: {rm.distance_served:,.0f} كم | التكلفة: {rm.cost}"
        for rm in recent_movements
    ]) or "  * لا توجد حركات استبدال مسجلة"

    context_sections.append(
        f"### مراقبة قطع الغيار وسجل الاستبدال:\n"
        f"- القطع الحرجة المتأخرة التي تحتاج استبدال فوري:\n{overdue_parts_str}\n"
        f"- القطع المستحقة قريباً:\n{due_soon_str}\n"
        f"- أحدث حركات استبدال وتركيب القطع المسجلة:\n{recent_movements_str}"
    )

    # 6. Drivers Summary
    total_drivers = Driver.objects.count()
    active_drivers = Driver.objects.filter(status='ACTIVE').count()
    today = timezone.now().date()
    expired_licenses = Driver.objects.filter(license_expiry_date__lt=today).count()
    expiring_soon_licenses = Driver.objects.filter(
        license_expiry_date__gte=today,
        license_expiry_date__lte=today + timezone.timedelta(days=30)
    ).count()

    context_sections.append(
        f"### السائقون والكوادر التشغيلية:\n"
        f"- إجمالي السائقين: {total_drivers} (النشطون: {active_drivers})\n"
        f"- رخص قيادة منتهية الصلاحية: {expired_licenses}\n"
        f"- رخص قيادة تنتهي خلال 30 يوم: {expiring_soon_licenses}"
    )

    # 7. Targeted Entity Search (إذا ذكر المستخدم سيارة أو سائق أو قطعة محددة)
    if query:
        # Search vehicles
        matching_vehicles = Vehicle.objects.filter(
            Q(plate_number__icontains=query) |
            Q(internal_fleet_number__icontains=query) |
            Q(model__icontains=query) |
            Q(make__icontains=query) |
            Q(vin__icontains=query)
        )[:3]

        if matching_vehicles.exists():
            v_details = []
            for mv in matching_vehicles:
                v_trips = WorkPermit.objects.filter(vehicle=mv, status='COMPLETED').count()
                v_fuel_cost = FuelRecord.objects.filter(vehicle=mv).aggregate(s=Sum('total_cost'))['s'] or 0
                v_fuel_liters = FuelRecord.objects.filter(vehicle=mv).aggregate(s=Sum('quantity'))['s'] or 0
                v_maint_cost = MaintenanceRecord.objects.filter(vehicle=mv).aggregate(s=Sum('cost'))['s'] or 0
                v_details.append(
                    f"- مركبة {mv.plate_number} (#{mv.internal_fleet_number}): {mv.make} {mv.model} ({mv.year}) | العداد الحالي: {mv.current_odometer:,.0f} كم | الحالة: {mv.get_status_display()} | نوع الوقود: {mv.get_fuel_type_display()} | إجمالي الرحلات: {v_trips} | استهلاك الوقود: {v_fuel_liters:,.1f} لتر بتكلفة {v_fuel_cost:,.2f} | تكلفة الصيانة: {v_maint_cost:,.2f}"
                )
            context_sections.append("### بيانات تفصيلية للمركبات المطابقة لاستفسار المستخدم:\n" + "\n".join(v_details))

        # Search drivers
        matching_drivers = Driver.objects.filter(
            Q(full_name__icontains=query) |
            Q(phone__icontains=query) |
            Q(license_number__icontains=query)
        )[:3]
        if matching_drivers.exists():
            d_details = []
            for md in matching_drivers:
                d_trips = WorkPermit.objects.filter(driver=md, status='COMPLETED').count()
                curr_v = md.current_vehicle.plate_number if md.current_vehicle else "لا يوجد"
                d_details.append(
                    f"- السائق {md.full_name}: الهاتف {md.phone} | الحالة: {md.get_status_display()} | رخصة القيادة: {md.license_number} (تنتهي: {md.license_expiry_date}) | المركبة المسندة حالياً: {curr_v} | إجمالي الرحلات المنفذة: {d_trips}"
                )
            context_sections.append("### بيانات تفصيلية للسائقين المطابقين لاستفسار المستخدم:\n" + "\n".join(d_details))

    return "\n\n".join(context_sections)


def call_gemini_api(messages: list, system_instruction: str) -> str:
    """
    Calls Google Gemini Flash API with automatic fallback across supported model endpoints.
    """
    if not GEMINI_API_KEY:
        raise ValueError("مفتاح GEMINI_API_KEY غير موجود في إعدادات النظام.")

    payload = {
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": messages,
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.9,
            "maxOutputTokens": 2048,
        }
    }

    last_error = None

    for model in FLASH_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={GEMINI_API_KEY}"
        data_bytes = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={'Content-Type': 'application/json'}
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                candidates = data.get('candidates', [])
                if candidates and 'content' in candidates[0]:
                    parts = candidates[0]['content'].get('parts', [])
                    if parts:
                        return parts[0].get('text', '').strip()
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8', errors='ignore')
            logger.warning(f"Gemini API model {model} returned HTTP {e.code}: {error_body}")
            last_error = f"HTTP {e.code}: {error_body}"
            # Try next model in list
            continue
        except Exception as e:
            logger.error(f"Error calling model {model}: {str(e)}")
            last_error = str(e)
            continue

    raise RuntimeError(f"فشل الاتصال بنماذج Gemini Flash. التفاصيل: {last_error}")


def ask_fleet_ai(user_message: str, history: list = None, user=None) -> dict:
    """
    Main orchestration entry point: builds real-time DB context, packages conversation history,
    queries Gemini Flash, and returns Arabic answer with suggested follow-ups.
    """
    history = history or []
    cleaned_msg = user_message.strip().lower()

    # Fast-path for simple greetings
    if cleaned_msg in GREETING_WORDS or (len(cleaned_msg) < 15 and any(cleaned_msg == g for g in GREETING_WORDS)):
        user_name = getattr(user, 'full_name', '') if user else ''
        greeting_prefix = f"أهلاً وسهلاً بك {user_name}! 👋" if user_name else "أهلاً وسهلاً بك! 👋"
        return {
            "reply": (
                f"{greeting_prefix} مرحباً بك في **نظام أسطول** لإدارة المركبات والعمليات التشغيلية.\n\n"
                "أنا مساعدك الذكي المتخصص لمساعدتك في كل ما يتعلق بالأسطول. يمكنك سؤالي عن:\n"
                "• **المركبات والرحلات:** أكثر السيارات نشاطاً أو أعلى المسافات المقطوعة.\n"
                "• **استهلاك الوقود:** المركبات الأكثر استهلاكاً وتكاليف التموين.\n"
                "• **الصيانة وقطع الغيار:** المركبات التي تحتاج فحصاً أو استبدال قطع وزيوت عاجلة.\n"
                "• **السائقين:** بيانات السائقين، رخص القيادة، وحركات الإسناد.\n\n"
                "كيف يمكنني خدمتك اليوم؟"
            ),
            "suggestions": [
                "ما هي أكثر مركبة استهلكت وقوداً هذا الشهر؟",
                "أكثر سيارة عملت رحلات وأعلى مسافة مقطوعة؟",
                "هل توجد قطع غيار أو زيوت تحتاج استبدال عاجل؟",
                "من هو السائق الأكثر تنفيذاً للرحلات؟"
            ],
            "timestamp": timezone.now().isoformat()
        }

    # 1. Gather live system database data
    live_context = get_live_database_context(user_message)

    system_instruction = (
        "أنت 'المساعد الذكي لنظام أسطول' (Astol Fleet AI Assistant) - الذكاء الاصطناعي المدمج والمساعد الفني المتخصص لإدارة أسطول المركبات، السائقين، الرحلات، الصيانة، الوقود، وقطع الغيار.\n\n"
        "إليك إرشاداتك وقواعد عملك الأساسية:\n"
        "1. الترحيب والتفاعل الإنساني الودود: تفاعل مع المستخدمين بلطف وأسلوب راقٍ ومهذب دائماً.\n"
        "2. نطاق الاختصاص الحصري: أنت مخصص حصرياً لنظام إدارة أسطول المركبات (Astol Fleet ERP). إذا سألك المستخدم عن أي موضوع خارج النظام (مثل أسئلة عامة، مباريات ورياضة، طبخ، أخبار، سياسة، ألغاز، برمجة غير مرتبطة بنظامنا)، اعتذر بلطف وأخبره بأنك مخصص فقط لنظام أسطول ومتابعة المركبات والسائقين والعمليات التشغيلية، واقترح عليه ما يمكنك مساعدته به في الأسطول.\n"
        "3. استفسارات الأسطول: اعتمد بشكل أساسي ومطلق على بيانات النظام الحية المزودة في قسم [بيانات النظام المحدثة]. اذكر أرقام اللوحات، أرقام الأسطول الداخلي (#FL)، والكميات والتكاليف المحددة بدقة دون تخمين.\n"
        "4. تنظيم الإجابة: نظّم إجابتك باستخدام التنسيق الجميل (Markdown)، واستخدم الجداول أو النقاط والقوائم والخط العريض لتسهيل القراءة.\n"
        "5. إذا سألك المستخدم عن مركبة معينة أو سائق، قدم له ملخصاً شاملاً ومنظماً يشمل كافة السجلات المتاحة له في النظام.\n\n"
        "===================================================\n"
        "[بيانات النظام المحدثة لحظياً من قاعدة البيانات]:\n"
        f"{live_context}\n"
        "==================================================="
    )

    # 2. Build conversation contents for Gemini API
    gemini_contents = []
    for item in history[-6:]:  # Keep recent context
        role = "user" if item.get('role') == 'user' else "model"
        text = item.get('text') or item.get('content') or ""
        if text.strip():
            gemini_contents.append({
                "role": role,
                "parts": [{"text": text.strip()}]
            })

    # Add the current user query
    gemini_contents.append({
        "role": "user",
        "parts": [{"text": user_message.strip()}]
    })

    # 3. Call Gemini
    reply_text = call_gemini_api(gemini_contents, system_instruction)

    # 4. Generate dynamic suggestions based on conversation & fleet state
    suggestions = [
        "ما هي أكثر مركبة استهلكت وقوداً هذا الشهر؟",
        "أي المركبات تحتاج صيانة أو استبدال قطع فوراً؟",
        "من هو السائق الأكثر تنفيذاً للرحلات؟",
        "أعطني ملخصاً لتكاليف الصيانة الإجمالية."
    ]

    return {
        "reply": reply_text,
        "suggestions": suggestions,
        "timestamp": timezone.now().isoformat()
    }
