# citas/forms.py
from django import forms
from .models import Vehiculo, Cita, TipoServicio
from django.core.exceptions import ValidationError
import datetime

class VehiculoForm(forms.ModelForm):
    class Meta:
        model = Vehiculo
        fields = ['propietario', 'marca', 'modelo', 'año', 'placa', 'color']
        widgets = {
            'año': forms.NumberInput(attrs={'min': 1900, 'max': datetime.date.today().year + 1}),
        }

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super(VehiculoForm, self).__init__(*args, **kwargs)
        
        # Evaluar si es Staff
        es_staff = False
        if user:
            es_staff = user.is_superuser or (hasattr(user, 'perfil') and user.perfil.rol and user.perfil.rol.nombre in ['Administrador', 'Recepcionista', 'Mecánico'])
            
        if not es_staff:
            # Si un Cliente normal lo abre en su web, no debe poder cambiar el dueño de un carro
            if 'propietario' in self.fields:
                self.fields.pop('propietario')
        else:
            # Si es personal de mostrador, filtrar para que solo salgan clientes (no mecánicos)
            from django.contrib.auth.models import User
            self.fields['propietario'].queryset = User.objects.filter(perfil__rol__nombre='Cliente').order_by('first_name', 'username')
            self.fields['propietario'].label = "Cliente / Propietario del Vehículo"

class FechaHoraDisponibleForm(forms.Form):
    """Formulario para seleccionar fecha y ver horas disponibles"""
    fecha = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date', 'min': datetime.date.today().isoformat()}),
        initial=datetime.date.today
    )
    categoria_servicio = forms.ChoiceField(
        choices=TipoServicio.CATEGORIAS,
        required=True,
        label="Tipo de Servicio"
    )

class CitaForm(forms.ModelForm):
    # Generar opciones de hora por defecto (8:00 AM a 5:00 PM cada 30 min)
    def generar_opciones_hora():
        opciones = []
        hora_actual = datetime.time(8, 0)  # 8:00 AM
        hora_fin = datetime.time(17, 0)    # 5:00 PM
        
        while hora_actual < hora_fin:
            opciones.append((hora_actual.strftime('%H:%M'), hora_actual.strftime('%H:%M')))
            # Agregar 30 minutos
            hora_dt = datetime.datetime.combine(datetime.date.today(), hora_actual)
            hora_dt = hora_dt + datetime.timedelta(minutes=30)
            hora_actual = hora_dt.time()
        
        return opciones
    
    vehiculo = forms.ModelChoiceField(queryset=None)
    servicio = forms.ModelChoiceField(queryset=None)
    hora_inicio = forms.ChoiceField(choices=generar_opciones_hora())
    
    class Meta:
        model = Cita
        fields = ['vehiculo', 'servicio', 'fecha', 'hora_inicio', 'notas']
        widgets = {
            'fecha': forms.DateInput(attrs={'type': 'date', 'min': datetime.date.today().isoformat()}),
            'notas': forms.Textarea(attrs={'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        categoria = kwargs.pop('categoria', None)
        super(CitaForm, self).__init__(*args, **kwargs)
        
        # Filtrar vehículos del usuario actual
        if user:
            self.fields['vehiculo'].queryset = Vehiculo.objects.filter(propietario=user)
        
        # Filtrar servicios por categoría
        if categoria:
            self.fields['servicio'].queryset = TipoServicio.objects.filter(categoria=categoria)
        else:
            self.fields['servicio'].queryset = TipoServicio.objects.all()
    
    def clean_hora_inicio(self):
        hora_str = self.cleaned_data['hora_inicio']
        try:
            return datetime.datetime.strptime(hora_str, '%H:%M').time()
        except ValueError:
            raise ValidationError("Formato de hora inválido")

class GestionCitaForm(forms.ModelForm):
    class Meta:
        model = Cita
        fields = ['estado', 'atendida_por', 'notas']
        widgets = {
            'notas': forms.Textarea(attrs={'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super(GestionCitaForm, self).__init__(*args, **kwargs)
        # Solo permitimos usuarios con rol "Mecánico" para atender citas de servicios mecánicos
        from usuarios.models import Perfil, Rol
        from django.contrib.auth.models import User
        
        try:
            mecanicos = Perfil.objects.filter(rol__nombre__in=['Mecánico', 'Administrador']).values_list('usuario', flat=True)
            self.fields['atendida_por'].queryset = User.objects.filter(id__in=mecanicos)
        except:
            self.fields['atendida_por'].queryset = User.objects.filter(is_staff=True)

class RecepcionVehiculoForm(forms.ModelForm):
    class Meta:
        from .models import RecepcionVehiculo
        model = RecepcionVehiculo
        fields = [
            'vehiculo', 'kilometraje', 'nivel_gasolina',
            'motivo_ingreso', 'diagnostico_inicial', 'danos_previos',
            'tiene_llanta_repuesto', 'tiene_gata_herramientas',
            'tiene_radio', 'tiene_documentos', 'otros_objetos',
            'firma_cliente_text'
        ]
        widgets = {
            'motivo_ingreso': forms.Textarea(attrs={'rows': 2, 'placeholder': 'Ej. Ruido en el motor al acelerar'}),
            'diagnostico_inicial': forms.Textarea(attrs={'rows': 2, 'placeholder': 'Ej. Fuga de aceite visible cerca del carter'}),
            'danos_previos': forms.Textarea(attrs={'rows': 2, 'placeholder': 'Ej. Rayón en puerta derecha, faro izquierdo roto'}),
            'otros_objetos': forms.TextInput(attrs={'placeholder': 'Ej. Lentes, cargador de celular, documentos importantes'}),
            'firma_cliente_text': forms.TextInput(attrs={'placeholder': 'Escriba el nombre completo del cliente que entrega el vehículo'}),
        }
    
    def __init__(self, *args, **kwargs):
        super(RecepcionVehiculoForm, self).__init__(*args, **kwargs)
        # Opcional: Hacer que algunos campos booleanos tengan el estilo de un checkbox bonito (Bootstrap custom-switch)
        for field in ['tiene_llanta_repuesto', 'tiene_gata_herramientas', 'tiene_radio', 'tiene_documentos']:
            self.fields[field].widget.attrs.update({'class': 'custom-control-input'})