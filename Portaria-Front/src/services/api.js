import axios from 'axios';

const api = axios.create({
  // Se o back estiver rodando na sua máquina:
  baseURL: 'http://127.0.0.1:5000', 
});

export default api;