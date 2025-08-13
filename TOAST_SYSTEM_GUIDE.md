# 🍞 Toast Notification System

A beautiful, fully-featured toast notification system for the Smart Queue Admin App, designed to match the app's celestial color palette and modern design language.

## ✨ Features

### 🎨 **Beautiful Design**

- **Gradient backgrounds** with subtle animations
- **Custom color schemes** matching app palette (celestial, french-blue, citrine, caramel)
- **Glassmorphism effects** with backdrop blur
- **Smooth animations** for enter/exit transitions
- **Progress bar** showing auto-dismiss countdown
- **Responsive design** that works on all screen sizes

### 🚀 **Rich Functionality**

- **4 Toast Types**: Success, Error, Warning, Info
- **Auto-dismiss** with customizable duration
- **Persistent toasts** that don't auto-dismiss
- **Action buttons** for user interaction
- **Close buttons** for manual dismissal
- **Multiple toasts** can be displayed simultaneously
- **Accessibility features** with proper ARIA labels

### 🎯 **Easy Integration**

- **Simple hook-based API** (`useAppToast`)
- **Context-based state management**
- **TypeScript support** with full type safety
- **Consistent with app design** system

## 📦 Components

### `ToastProvider`

- Wraps the entire app to provide toast context
- Manages toast state and timing
- Already integrated in `layout.tsx`

### `ToastContainer`

- Renders all active toasts
- Positioned fixed at top-right
- Handles animations and interactions

### `useAppToast` Hook

- Primary interface for showing toasts
- Provides convenient methods for all toast types

## 🔧 Usage

### Basic Usage

```tsx
import { useAppToast } from '@/hooks/useAppToast'

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useAppToast()

  const handleSave = async () => {
    try {
      await saveData()
      showSuccess('Saved!', 'Your data has been saved successfully.')
    } catch (error) {
      showError('Save Failed', 'Unable to save your data. Please try again.')
    }
  }

  return <button onClick={handleSave}>Save</button>
}
```

### With Action Button

```tsx
showSuccess(
  'Customer Called!',
  'Ticket #A001 is now being served.',
  {
    label: 'View Details',
    onClick: () => navigateToTicket('A001')
  }
)
```

### Persistent Toast

```tsx
showPersistent(
  'warning',
  'Important Notice',
  'System maintenance will begin in 10 minutes.'
)
```

## 🎨 Toast Types

### Success Toast

- **Color**: Emerald green gradient
- **Icon**: CheckCircle
- **Duration**: 5 seconds
- **Use for**: Successful operations, confirmations

### Error Toast

- **Color**: Red gradient
- **Icon**: AlertCircle
- **Duration**: 7 seconds (longer for errors)
- **Use for**: Failed operations, validation errors

### Warning Toast

- **Color**: Citrine yellow gradient
- **Icon**: AlertTriangle
- **Duration**: 6 seconds
- **Use for**: Important notices, cautions

### Info Toast

- **Color**: Celestial blue gradient
- **Icon**: Info
- **Duration**: 5 seconds
- **Use for**: General information, tips

## 🎛️ API Reference

### `useAppToast()` Returns

```tsx
interface ToastMethods {
  showSuccess: (title: string, message?: string, action?: Action) => void
  showError: (title: string, message?: string, action?: Action) => void
  showWarning: (title: string, message?: string, action?: Action) => void
  showInfo: (title: string, message?: string, action?: Action) => void
  showPersistent: (type: ToastType, title: string, message?: string, action?: Action) => void
}
```

### Action Interface

```tsx
interface Action {
  label: string
  onClick: () => void
}
```

## 🎨 Styling

The toast system uses Tailwind CSS with custom color extensions:

- `celestial-*`: Blue tones for info toasts
- `french-*`: Darker blue for actions
- `citrine-*`: Yellow for warnings
- `caramel-*`: Orange for accent colors

## 🚀 Integration Examples

### Dashboard Queue Management

```tsx
// Call next customer
const callNext = async () => {
  try {
    await callNextCustomer()
    showSuccess(
      'Customer Called!',
      `Now serving ticket ${ticketNumber}`,
      {
        label: 'View Queue',
        onClick: () => scrollToQueue()
      }
    )
  } catch (error) {
    showError(
      'Call Failed',
      'Unable to call next customer.',
      {
        label: 'Retry',
        onClick: () => callNext()
      }
    )
  }
}
```

### Form Validation

```tsx
const validateForm = () => {
  if (!email) {
    showWarning('Email Required', 'Please enter your email address.')
    return false
  }
  
  if (!isValidEmail(email)) {
    showError('Invalid Email', 'Please enter a valid email address.')
    return false
  }
  
  return true
}
```

### System Notifications

```tsx
useEffect(() => {
  if (systemMaintenance) {
    showPersistent(
      'warning',
      'Maintenance Mode',
      'The system will be unavailable for maintenance from 2:00 AM to 4:00 AM.'
    )
  }
}, [systemMaintenance])
```

## 🎯 Best Practices

### When to Use Each Type

1. **Success** ✅
   - Data saved successfully
   - Actions completed
   - Positive confirmations

2. **Error** ❌
   - Failed API calls
   - Validation errors
   - Critical failures

3. **Warning** ⚠️
   - Important notices
   - Before destructive actions
   - System alerts

4. **Info** ℹ️
   - General information
   - Tips and hints
   - Non-critical updates

### Message Guidelines

- **Keep titles short** (2-4 words)
- **Be specific** in messages
- **Use action-oriented language**
- **Provide solutions** when possible

### Accessibility

- All toasts have proper ARIA labels
- Close buttons have descriptive titles
- Keyboard navigation supported
- Screen reader friendly

## 🔮 Future Enhancements

- **Sound notifications** for important toasts
- **Toast queuing** with priority system
- **Custom animations** per toast type
- **Swipe to dismiss** on mobile
- **Position options** (top-left, bottom-right, etc.)
- **Dark mode support**

---

The toast notification system provides a professional, user-friendly way to communicate with users throughout the Smart Queue Admin App, enhancing the overall UX with beautiful, informative feedback. 🎉
