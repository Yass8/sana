// src/api/invoices.api.js
import api from './axios'

export const invoicesApi = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.patch(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  sendEmail: (id, data) => api.post(`/invoices/${id}/send-email`, data),
  getAvailableParcels: (params) => api.get('/invoices/available-parcels', { params }),
  pay: (id, data) => api.post(`/invoices/${id}/pay`, data),
}

export default invoicesApi
