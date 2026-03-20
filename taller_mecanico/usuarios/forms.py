# usuarios/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm
from .models import Perfil, Rol

class TallerLoginForm(AuthenticationForm):
    """Formulario de inicio de sesión personalizado para pedir el correo"""
    username = forms.CharField(label="Correo Electrónico", widget=forms.TextInput(attrs={'autofocus': True}))

    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        if username is not None and password:
            from django.contrib.auth import authenticate, get_user_model
            from django.db.models import Q
            User = get_user_model()
            
            # Interceptamos cuentas no activadas para dar un mensaje Ultra Claro
            user_qs = User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username))
            if user_qs.exists():
                user = user_qs.first()
                if user.check_password(password) and not user.is_active:
                    raise forms.ValidationError(
                        "⚠️ Tu cuenta aún no ha sido verificada. Por favor, abre tu correo electrónico y haz clic en el enlace azul de activación que te enviamos.",
                        code='inactive',
                    )

            # Si no era por inactividad, seguimos con el chequeo habitual de Django
            self.user_cache = authenticate(self.request, username=username, password=password)
            if self.user_cache is None:
                raise self.get_invalid_login_error()
            else:
                self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data

class UserRegisterForm(forms.ModelForm):
    first_name = forms.CharField(max_length=50, required=True, label="Nombre(s)")
    last_name = forms.CharField(max_length=50, required=True, label="Apellido(s)")
    email = forms.EmailField(required=True, label="Correo Electrónico")
    password = forms.CharField(label='Contraseña', widget=forms.PasswordInput)
    password_confirm = forms.CharField(label='Confirmar Contraseña', widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            users = User.objects.filter(email__iexact=email)
            if users.exists():
                user = users.first()
                if user.has_usable_password():
                    raise forms.ValidationError("Este correo ya está registrado y activo. Por favor regresa e inicia sesión.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")

        if password and password_confirm:
            if password != password_confirm:
                self.add_error('password_confirm', "Las contraseñas no coinciden.")
            else:
                from django.contrib.auth.password_validation import validate_password
                try:
                    # Validar contra los parámetros de seguridad globales de Django
                    validate_password(password)
                except forms.ValidationError as e:
                    self.add_error('password', e)
        return cleaned_data

    def save(self, commit=True):
        email = self.cleaned_data.get('email')
        users_with_email = User.objects.filter(email__iexact=email)
        
        if users_with_email.exists() and not users_with_email.first().has_usable_password():
            # 1. ACTUALIZAR (Fusión de cliente físico)
            user = users_with_email.first()
            user.first_name = self.cleaned_data.get('first_name')
            user.last_name = self.cleaned_data.get('last_name')
            user.set_password(self.cleaned_data["password"])
            user.is_active = False  # Prevenir Account Takeover: Debe verificar su email antes de entrar
            if commit:
                user.save()
            return user
        else:
            # 2. CREAR NUEVO (Auto-generar username a partir del email)
            user = super().save(commit=False)
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
                
            user.username = username
            user.set_password(self.cleaned_data["password"])
            user.is_active = False  # Obligatorio verificar email en nuevos registros
            if commit:
                user.save()
            return user

class UserUpdateForm(forms.ModelForm):
    email = forms.EmailField()
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']

class PerfilUpdateForm(forms.ModelForm):
    class Meta:
        model = Perfil
        fields = ['telefono', 'direccion']

class RolForm(forms.ModelForm):
    class Meta:
        model = Rol
        fields = ['nombre', 'descripcion']

class AsignarRolForm(forms.ModelForm):
    class Meta:
        model = Perfil
        fields = ['rol']

class ClienteRapidoForm(forms.ModelForm):
    """Formulario para que la Secretaria/Recepción registre un nuevo cliente rápido"""
    first_name = forms.CharField(max_length=50, required=True, label="Nombres")
    last_name = forms.CharField(max_length=50, required=True, label="Apellidos")
    email = forms.EmailField(required=True, label="Correo Electrónico (Será su Usuario)")
    telefono = forms.CharField(max_length=20, required=False, label="Teléfono (Whatsapp/Celular)")
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']