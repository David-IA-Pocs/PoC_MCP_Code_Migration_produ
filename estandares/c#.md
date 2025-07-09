
# Estándares de desarrollo para Angular

Este documento establece convenciones para mantener un código Angular limpio, consistente y fácil de mantener en versiones modernas como Angular 19.

---

## 1. Uso de **`snake_case`** para nombres de archivos

**Motivo**: Facilita la lectura de archivos en sistemas sensibles a mayúsculas (como Linux) y sigue la convención estándar en Angular.

**Ejemplo correcto**:
```bash
user_profile.component.ts
login_service.ts
user_data.model.ts
```

**Ejemplo incorrecto**:
```bash
UserProfile.component.ts
loginService.ts
UserDataModel.ts
```

---

## 2. Agrupar archivos por funcionalidad (Feature-based Structure)

**Motivo**: Mejora la escalabilidad y organización del proyecto, especialmente en aplicaciones grandes.

**Estructura sugerida**:
```
/src/app/
  /users/
    users.component.ts
    users.service.ts
    users.model.ts
  /auth/
    login.component.ts
    auth.service.ts
```

Evitar estructuras planas o técnicas (como `components/`, `services/` separadas sin contexto).

---

## 3. Decoradores y tipado explícito

**Motivo**: Angular 15+ (incluyendo 19) promueve el uso de decoradores estándar de TypeScript y el tipado fuerte para mejorar el rendimiento y reducir errores en tiempo de compilación.

**Ejemplo correcto**:
```ts
@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user.component.html'
})
export class UserComponent {
  @Input() userData!: User;
}
```

**Recomendaciones**:
- Usa `standalone: true` para componentes si no es necesario un `NgModule`.
- Usa `!:` o inicializa las variables requeridas para evitar errores de compilación estricta.

---
