from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .services import ask_fleet_ai


class AIChatView(APIView):
    """
    محادثة المساعد الذكي لنظام أسطول مع تحليل لحظي لقاعدة البيانات
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])

        if not message:
            return Response(
                {'error': 'الرسالة مطلوبة'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = ask_fleet_ai(
                user_message=message,
                history=history,
                user=request.user
            )
            return Response({
                'success': True,
                'reply': result['reply'],
                'suggestions': result['suggestions'],
                'timestamp': result['timestamp']
            })
        except ValueError as ve:
            return Response(
                {'error': str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f"عذراً، حدث خطأ أثناء معالجة الطلب مع الذكاء الاصطناعي: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AISuggestionsView(APIView):
    """
    الأسئلة والاقتراحات السريعة الموصى بها للمستخدم
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        suggestions = [
            "ما هي أكثر مركبة استهلكت وقوداً هذا الشهر؟",
            "أكثر سيارة عملت رحلات وأعلى مسافة مقطوعة؟",
            "هل توجد قطع غيار أو زيوت تحتاج استبدال عاجل؟",
            "من هو السائق الأكثر تنفيذاً للرحلات؟",
            "ملخص عام لتكاليف الصيانة والورش الأكثر تعاملاً",
            "كم عدد المركبات الجاهزة والمتاحة للعمل حالياً؟"
        ]
        return Response({
            'success': True,
            'suggestions': suggestions
        })
