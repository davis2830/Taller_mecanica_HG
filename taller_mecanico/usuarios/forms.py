# usuarios/forms.py
from django import forms
from django.contrib.auth.models import User
from .models import Perfil, Rol


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