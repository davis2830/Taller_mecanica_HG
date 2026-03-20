from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

UserModel = get_user_model()

class EmailAuthBackend(ModelBackend):
    """
    Autenticación personalizada que permite iniciar sesión usando el correo
    electrónico o el nombre de usuario de Django de forma intercambiable.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Buscar el usuario por username O por email
            user = UserModel.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except UserModel.DoesNotExist:
            UserModel().set_password(password) # Mitigar ataques de temporización (timing attacks)
            return None
        except UserModel.MultipleObjectsReturned:
            user = UserModel.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).order_by('id').first()

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
