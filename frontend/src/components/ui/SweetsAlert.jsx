import Swal from 'sweetalert2'

// Classes Tailwind pour les boutons
const buttonClasses = {
  confirm: 'bg-red-600 hover:bg-red-200 text-white font-semibold py-2 px-4 mx-4 rounded-lg focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors',
  cancel: 'bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors',
  success: 'bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-colors',
  error: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors'
}

/**
 * Confirme une suppression.
 * Retourne `true` si l'utilisateur clique sur "Supprimer", sinon `false`.
 */
export async function confirmDeleteAlert({
  message,
  confirmButtonText = 'Supprimer',
  cancelButtonText = 'Annuler',
} = {}) {
  const result = await Swal.fire({
    icon: 'warning',
    title: undefined,
    text: message ?? '',
    background: '#FFFFFF',
    color: '#0F172A',
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    showCancelButton: true,
    buttonsStyling: false,
    customClass: {
      confirmButton: buttonClasses.confirm,
      cancelButton: buttonClasses.cancel,
      popup: 'rounded-2xl shadow-xl',
      title: 'text-lg font-bold',
      htmlContainer: 'text-sm text-gray-600'
    }
  })

  return result.isConfirmed
}

export async function confirmActionAlert({
  title = 'Confirmer',
  message,
  confirmButtonText = 'Oui',
  cancelButtonText = 'Annuler',
} = {}) {
  const result = await Swal.fire({
    icon: 'question',
    title,
    text: message ?? '',
    background: '#FFFFFF',
    color: '#0F172A',
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    showCancelButton: true,
    buttonsStyling: false,
    customClass: {
      confirmButton: buttonClasses.success,
      cancelButton: buttonClasses.cancel,
      popup: 'rounded-2xl shadow-xl',
      title: 'text-lg font-bold',
      htmlContainer: 'text-sm text-gray-600'
    }
  })

  return result.isConfirmed
}

export async function showSuccessAlert({ title = 'Succès', text = 'Opération réussie.' } = {}) {
  await Swal.fire({
    icon: 'success',
    title,
    text,
    background: '#FFFFFF',
    color: '#0F172A',
    confirmButtonText: 'OK',
    buttonsStyling: false,
    customClass: {
      confirmButton: buttonClasses.success,
      popup: 'rounded-2xl shadow-xl',
      title: 'text-lg font-bold',
      htmlContainer: 'text-sm text-gray-600'
    }
  })
}

export async function showErrorAlert({ title = 'Échec', text = 'Une erreur est survenue.' } = {}) {
  await Swal.fire({
    icon: 'error',
    title,
    text,
    background: '#FFFFFF',
    color: '#0F172A',
    confirmButtonText: 'OK',
    buttonsStyling: false,
    customClass: {
      confirmButton: buttonClasses.error,
      popup: 'rounded-2xl shadow-xl',
      title: 'text-lg font-bold',
      htmlContainer: 'text-sm text-gray-600'
    }
  })
}