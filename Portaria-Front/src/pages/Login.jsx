import api from '../services/api';

function Login() {
  const handleLogin = async () => {
    try {
      const response = await api.post('/login', {
        username: 'admin',
        password: '123'
      });
      console.log("Sucesso!", response.data);
    } catch (error) {
      console.error("Erro ao conectar no back:", error);
    }
  };

  return (
    <div>
      <h1>Portaria Eletrônica</h1>
      <button onClick={handleLogin}>Entrar</button>
    </div>
  );
}