import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert, Activity, UserPlus, Users, Database,
  Trash2, X, User, Search, CheckCircle2, AlertCircle, Camera, Lock, LogOut, Clock
} from 'lucide-react';
import api from './services/api';
import CameraAcesso from './components/CameraAcesso';

function App() {
  const [aba, setAba] = useState('monitoramento');
  const videoRef = useRef(null);
  const [monitoramentoAtivo, setMonitoramentoAtivo] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [logs, setLogs] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [fotoConfirmada, setFotoConfirmada] = useState(null);
  const [ocultarLogs, setOcultarLogs] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [role, setRole] = useState(null);
  const [alertaEstranho, setAlertaEstranho] = useState(false);
  const contadorEstranhoRef = useRef(0);
  // ... (abaixo do const [ocultarLogs, setOcultarLogs])

  // ESTADOS DE SEGURANÇA E LOGIN
  const [sessao, setSessao] = useState(null);
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // ESTADOS DE BACKUP (APENAS PARA ADMIN)
  const [backups, setBackups] = useState([]);

  const [usuarioParaAtualizar, setUsuarioParaAtualizar] = useState(null);
  const [novaFotoCapturada, setNovaFotoCapturada] = useState(null);

  const webcamRef = useRef(null);
  const webcamCadastroRef = useRef(null);
  const webcamAtualizarRef = useRef(null);
  const capturarSnapshot = () => {
    // Usamos o webcamRef, que é o que seu sistema já usa para a IA
    if (webcamRef.current) {
      return webcamRef.current.getScreenshot();
    }
    return null;
  };

  const [form, setForm] = useState({
    nome: '', doc: '', tipo: 'morador',
    unidade: '', bloco: '', placa: '',
    empresa: '', visita_para: '', obs: ''
  });

  const carregarDados = async () => {
    try {
      const [u, l] = await Promise.all([api.get('/api/users'), api.get('/api/log')]);
      setUsuarios(u.data);
      setLogs(l.data);
    } catch (e) { console.error("Erro na comunicação."); }
  };

  const carregarBackups = useCallback(async () => {
    if (role !== 'admin') return; // Corrigido para verificar a variável certa
    try {
      const config = { headers: { Authorization: `Bearer ${sessao}` } };
      const res = await api.get('/api/backup', config);
      setBackups(res.data.backups || []);
    } catch (e) { console.error("Erro ao carregar backups."); }
  }, [sessao, role]);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (aba === 'backups') {
      carregarBackups();
    }
  }, [aba, carregarBackups]);

  const excluirLog = async (id) => {
    if (!window.confirm("Deseja remover esta foto?")) return;
    try {
      // O 'sessao' aqui é o token que o Python gerou no login
      const config = { headers: { Authorization: `Bearer ${sessao}` } };
      await api.delete(`/api/logs/${id}`, config);
      setLogs(logs.filter(l => l.id !== id));
    } catch (err) {
      alert("Erro ao excluir: Verifique se você está logada como Admin.");
    }
  };

  const reconhecerFace = useCallback(async () => {
    if (!monitoramentoAtivo || targetUser || !webcamRef.current || aba !== 'monitoramento' || modalLoginAberto) return;
    if (targetUser || !webcamRef.current || aba !== 'monitoramento' || modalLoginAberto) return;

    const frame = webcamRef.current.getScreenshot();
    if (!frame) return;

    try {
      const res = await api.post('/api/recognize', { foto: frame });

      if (res.data && res.data.match) {
        // É morador conhecido! Libera acesso e zera o alerta.
        setTargetUser(res.data.user);
        setAlertaEstranho(false);
        contadorEstranhoRef.current = 0;

      } else if (res.data && res.data.unknown_face) {
        // Tem um rosto desconhecido. Vamos contar o tempo...
        contadorEstranhoRef.current += 1;

        // Se bater 4 vezes seguidas (aprox. 4 a 5 segundos encarando a câmera)
        if (contadorEstranhoRef.current >= 4) {
          setAlertaEstranho(true);
        }

      } else {
        // Não tem rosto humano nenhum na câmera (pessoa foi embora ou era só um vulto)
        // Zera tudo!
        contadorEstranhoRef.current = 0;
        setAlertaEstranho(false);
      }
    } catch (e) { }
  }, [targetUser, aba, modalLoginAberto]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (aba === 'monitoramento') {
        reconhecerFace();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [aba, reconhecerFace]);

  const fazerLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/login', loginForm);
      console.log("Resposta do servidor:", res.data); // Veja isso no F12

      // Salva os dados necessários
      setSessao(res.data.token);
      setRole(res.data.role);

      // Fecha o modal e limpa os campos
      setModalLoginAberto(false);
      setLoginForm({ username: '', password: '' });

      alert(`Bem-vindo, ${res.data.name}!`);
    } catch (err) {
      console.error("Erro detalhado:", err.response ? err.response.data : err);
      alert("Falha no login: verifique usuário e senha.");
    }
  };

  const fazerLogout = () => {
    setSessao(null);
    delete api.defaults.headers.common['Authorization'];
    setAba('monitoramento');
  };

  const capturarFotoCadastro = () => {
    if (webcamCadastroRef.current) {
      const foto = webcamCadastroRef.current.getScreenshot();
      if (foto) setFotoConfirmada(foto);
    }
  };

  const capturarNovaFoto = () => {
    if (webcamAtualizarRef.current) {
      const foto = webcamAtualizarRef.current.getScreenshot();
      if (foto) setNovaFotoCapturada(foto);
    }
  };

  const confirmarAtualizacaoFoto = async () => {
    if (!novaFotoCapturada) return alert("Capture a nova foto primeiro.");
    try {
      await api.put(`/api/users/${usuarioParaAtualizar.id}/foto`, { foto: novaFotoCapturada });
      alert("Biometria atualizada com sucesso!");
      setUsuarioParaAtualizar(null);
      setNovaFotoCapturada(null);
      carregarDados();
    } catch (e) {
      alert("Sessão expirada ou sem permissão.");
    }
  };

  const salvarNovoRegistro = async (e) => {
    if (e) e.preventDefault();
    if (!fotoConfirmada) return alert("ERRO: Captura facial obrigatória.");

    try {
      const config = { headers: { Authorization: `Bearer ${sessao}` } };

      // Aqui estamos montando o pacote de dados para o Python entender
      const dados = {
        name: form.nome,
        nome: form.nome,
        doc: form.doc,
        tipo: form.tipo,
        unidade: form.unidade,
        obs: form.obs,
        foto: fotoConfirmada
      };

      await api.post('/api/users', dados, config);

      alert("Usuário cadastrado com sucesso!");
      setForm({ nome: '', doc: '', tipo: 'morador', unidade: '', bloco: '', placa: '', empresa: '', visita_para: '', obs: '' });
      setFotoConfirmada(null);
      setAba('monitoramento');
      carregarDados();

    } catch (err) {
      console.error("ERRO:", err.response?.data);
      const msg = err.response?.data?.error || "Erro de permissão ou conexão";
      alert("ERRO: " + msg);
    }
  };

  const deletarUsuario = async (id) => {
    if (!window.confirm("Deseja realmente remover este registro do sistema?")) return;

    try {
      // Cria o crachá com o token
      const config = { headers: { Authorization: `Bearer ${sessao}` } };

      // Envia o crachá junto com o pedido para deletar
      await api.delete(`/api/users/${id}`, config);

      // Remove da tela na hora
      setUsuarios(usuarios.filter(u => u.id !== id));
      alert("Registro excluído com sucesso!");

    } catch (err) {
      console.error(err);
      alert("Erro ao excluir: Você não tem permissão ou a sessão expirou.");
    }
  };

  // ----- FUNÇÕES DE BACKUP NO FRONTEND -----
  const criarBackup = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${sessao}` } };
      await api.post('/api/backup', {}, config);
      alert("Backup gerado no servidor!");
      carregarBackups();
    } catch (e) { alert("Erro ao gerar backup."); }
  };

  const deletarBackup = async (filename) => {
    if (window.confirm(`Excluir permanentemente o backup ${filename}?`)) {
      try {
        const config = { headers: { Authorization: `Bearer ${sessao}` } };
        await api.delete(`/api/backup/${filename}`, config);
        carregarBackups();
      } catch (e) { alert("Erro ao excluir backup."); }
    }
  };

  const restaurarBackup = async (filename) => {
    if (window.confirm(`ATENÇÃO: Restaurar o banco para ${filename} vai sobrescrever os dados atuais. Continuar?`)) {
      try {
        const config = { headers: { Authorization: `Bearer ${sessao}` } };
        await api.post(`/api/backup/${filename}/restore`, {}, config);
        alert("Backup restaurado com sucesso! Os dados foram atualizados.");
        carregarDados();
      } catch (e) { alert("Erro ao restaurar backup."); }
    }
  };

  const baixarBackup = async (filename) => {
    try {
      // Aqui mesclamos os cabeçalhos com o formato de arquivo (blob)
      const config = { headers: { Authorization: `Bearer ${sessao}` }, responseType: 'blob' };
      const response = await api.get(`/api/backup/${filename}/download`, config);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) { alert("Erro ao baixar backup."); }
  };

  const alterarSenha = async () => {
    const usuario = prompt("Digite o usuário que deseja alterar (admin ou porteiro):");
    if (!usuario) return;
    const novaSenha = prompt(`Digite a nova senha para ${usuario}:`);
    if (!novaSenha) return;

    try {
      const config = { headers: { Authorization: `Bearer ${sessao}` } };

      await api.post('/api/admin/update-password', {
        username: usuario,
        new_password: novaSenha
      }, config);

      alert("Sucesso: Senha atualizada com segurança!");
    } catch (e) {
      alert(e.response?.data?.error || "Erro ao alterar senha");
    }
  };

  return (
    <>
      <style>{`
        /* RESET & BASE */
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: #F8F6F4; color: #3A312B; overflow: hidden; }
        
        .app-shell { display: flex; height: 100vh; width: 100%; }
        
        /* SIDEBAR */
        .sidebar { width: 260px; background-color: #FFFFFF; border-right: 1px solid #EAE4DD; display: flex; flex-direction: column; padding: 32px 20px; z-index: 10; flex-shrink: 0; }
        .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 1.1rem; color: #3A312B; margin-bottom: 48px; letter-spacing: -0.5px; text-transform: uppercase; }
        .nav-menu { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .nav-btn { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: none; background: transparent; color: #857870; font-size: 0.95rem; font-weight: 600; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; text-align: left; }
        .nav-btn:hover { background-color: #FDFBF9; color: #3A312B; }
        .nav-btn.active { background-color: #FDF6F3; color: #C07D5E; } 
        .nav-btn.active svg { color: #C07D5E; }
        
        /* BOTÃO DE LOGIN NA SIDEBAR */
        .auth-panel { margin-top: auto; border-top: 1px solid #EAE4DD; padding-top: 20px; }
        .btn-auth { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 14px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-auth.login { background: #3A312B; color: white; border: none; }
        .btn-auth.login:hover { background: #1C1917; }
        .btn-auth.logout { background: #FDECEC; color: #A83232; border: 1px solid #F8D0D0; }
        .btn-auth.logout:hover { background: #F8D0D0; }

        /* ÁREA CENTRAL */
        .main-viewport { flex: 1; overflow-y: auto; overflow-x: hidden; background-color: #F8F6F4; display: flex; flex-direction: column; align-items: center; }
        .content-wrapper { width: 100%; max-width: 1100px; padding: 32px; margin: 0 auto; display: flex; flex-direction: column; } 
        
        .page-header { margin-bottom: 24px; }
        .page-title { font-size: 1.7rem; font-weight: 700; color: #3A312B; letter-spacing: -0.5px; }
        .page-subtitle { font-size: 0.95rem; color: #857870; margin-top: 4px; }
        .ui-card { background: #FFFFFF; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(58, 49, 43, 0.04); border: 1px solid #EAE4DD; }

        /* MONITORAMENTO */
        .view-flex { display: flex; gap: 24px; flex-wrap: wrap; width: 100%; }
        .monitor-cam-container { flex: 1; min-width: 320px; display: flex; flex-direction: column; gap: 16px; }
        .camera-box { background: #1C1917; border-radius: 16px; overflow: hidden; position: relative; border: 4px solid #FFFFFF; box-shadow: 0 8px 24px rgba(58, 49, 43, 0.06); display: flex; align-items: center; justify-content: center; aspect-ratio: 4/3; width: 100%; }
        
        .logs-container { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 900px) { .logs-container { width: 100%; } } 

        .stat-card { background: #FFFFFF; border-radius: 16px; padding: 20px; border: 1px solid #EAE4DD; display: flex; align-items: center; gap: 16px; }
        .stat-number { font-size: 2rem; font-weight: 800; color: #C07D5E; line-height: 1; }
        .stat-label { font-size: 0.85rem; font-weight: 600; color: #857870; text-transform: uppercase; letter-spacing: 0.5px; }

        .logs-panel { flex: 1; display: flex; flex-direction: column; max-height: calc(100vh - 250px); }
        .logs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #EAE4DD; }
        .logs-list { overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .log-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #FAFAFA; border-radius: 12px; border: 1px solid #F0ECE7; }
        .tag { padding: 4px 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; }
        .tag.in { background: #E8F3EB; color: #2C6B3E; }
        .tag.out { background: #FDECEC; color: #A83232; }

        /* CADASTRO */
        .cadastro-flex { display: flex; gap: 32px; flex-wrap: wrap; width: 100%; }
        .form-section { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 16px; }
        .biometria-box { width: 320px; flex-shrink: 0; background: #FAFAFA; border: 2px dashed #EAE4DD; border-radius: 16px; padding: 20px; text-align: center; display: flex; flex-direction: column; gap: 16px; height: fit-content; }
        @media (max-width: 900px) { .biometria-box { width: 100%; } }

        .input-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .input-row > div { flex: 1; min-width: 140px; }
        
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-group label { font-size: 0.8rem; font-weight: 600; color: #857870; text-transform: uppercase; letter-spacing: 0.5px; }
        .field-group input, .field-group select { width: 100%; padding: 12px 16px; background-color: #FDFCFB; border: 1px solid #EAE4DD; border-radius: 10px; font-size: 0.95rem; color: #3A312B; outline: none; transition: all 0.2s; }
        .field-group input:focus, .field-group select:focus { border-color: #C07D5E; box-shadow: 0 0 0 3px rgba(192, 125, 94, 0.1); background-color: #FFFFFF; }
        
        .btn-primary { background-color: #C07D5E; color: #FFFFFF; border: none; padding: 14px 24px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 8px; width: 100%; }
        .btn-primary:hover { background-color: #A6684C; }
        .btn-capturar { display: flex; align-items: center; justify-content: center; gap: 8px; background-color: #3A312B; color: #FFFFFF; border: none; padding: 12px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; }
        .btn-capturar:hover { background-color: #1C1917; }
        .btn-capturar.success { background-color: #2C6B3E; }
        .camera-mask { border-radius: 12px; overflow: hidden; background: #000; aspect-ratio: 4/3; width: 100%; }

        /* BASE DE DADOS E BACKUPS */
        .db-list { display: flex; flex-direction: column; gap: 12px; }
        .user-row { background: #FFFFFF; border: 1px solid #EAE4DD; padding: 16px 20px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; }
        .user-row:hover { border-color: #D6CFC8; box-shadow: 0 4px 12px rgba(58, 49, 43, 0.04); }
        .user-info-wrapper { display: flex; align-items: center; gap: 16px; }
        .user-avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid #FDF6F3; background: #FFF; }
        .user-avatar-placeholder { width: 52px; height: 52px; border-radius: 50%; background: #F0ECE7; display: flex; align-items: center; justify-content: center; color: #A89F96; }
        .user-details h4 { font-size: 1.05rem; font-weight: 600; color: #3A312B; margin-bottom: 4px; }
        .user-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 0.85rem; color: #857870; }
        .badge-tipo { background: #F8F6F4; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; color: #5A4E46; border: 1px solid #EAE4DD; }
        
        .row-actions { display: flex; gap: 8px; }
        .btn-icon { background: transparent; border: none; color: #A89F96; cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; }
        .btn-icon.edit:hover { background: #FDF6F3; color: #C07D5E; }
        .btn-icon.delete:hover { background: #FDECEC; color: #A83232; }

        /* MODAIS GERAIS (IA E LOGIN) */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(38, 30, 26, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-card { background: #FFFFFF; padding: 32px; border-radius: 20px; width: 100%; max-width: 400px; text-align: center; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.15); animation: popIn 0.2s ease-out; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .modal-avatar { width: 130px; height: 130px; border-radius: 50%; object-fit: cover; border: 4px solid #FFFFFF; box-shadow: 0 8px 24px rgba(192, 125, 94, 0.2); margin: 0 auto 20px; }
        .modal-card h2 { font-size: 1.4rem; font-weight: 700; color: #3A312B; margin-bottom: 6px; }
        .modal-card p { color: #857870; font-size: 0.9rem; margin-bottom: 24px; }
        .modal-actions { display: flex; gap: 12px; }
        .btn-modal { flex: 1; padding: 14px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
        .btn-modal.entrada { background: #E8F3EB; color: #2C6B3E; }
        .btn-modal.entrada:hover { background: #D0E8D5; }
        .btn-modal.saida { background: #FDECEC; color: #A83232; }
        .btn-modal.saida:hover { background: #F8D0D0; }
        /* REGRA DO BOTÃO DESABILITADO (FICA CINZA) */
        .btn-modal:disabled { 
          background: #EAE4DD !important; 
          color: #A89F96 !important; 
          cursor: not-allowed; 
          opacity: 0.6; 
        }
        .btn-close-modal { position: absolute; top: 16px; right: 16px; background: #F8F6F4; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #857870; cursor: pointer; }
        .btn-close-modal:hover { background: #EAE4DD; color: #3A312B; }
        
        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #EAE4DD; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #D6CFC8; }
        .tag.panic {
  background: #A83232; /* Vermelho escuro/alerta */
  color: white;
  border: 1px solid #FF4757;
}
      `}</style>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <ShieldAlert size={24} color="#C07D5E" />
            <span>SISTEMA PORTARIA</span>
          </div>

          <nav className="nav-menu">
            <button className={`nav-btn ${aba === 'monitoramento' ? 'active' : ''}`} onClick={() => setAba('monitoramento')}>
              <Activity size={20} /> Monitoramento
            </button>

            {/* ABAS PROTEGIDAS PELA SESSÃO */}
            {sessao && (
              <>
                <button className={`nav-btn ${aba === 'cadastro' ? 'active' : ''}`} onClick={() => setAba('cadastro')}>
                  <UserPlus size={20} /> Novo Registro
                </button>
                <button className={`nav-btn ${aba === 'banco' ? 'active' : ''}`} onClick={() => setAba('banco')}>
                  <Users size={20} /> Banco de Dados
                </button>

                {/* Só mostra se houver sessão E o usuário for admin */}
                {/* Substitua o botão de backup por este bloco exato */}
                {sessao && role === 'admin' && (
                  <button
                    className={`nav-btn ${aba === 'backups' ? 'active' : ''}`}
                    onClick={() => {
                      setAba('backups'); // O NOME AQUI TEM QUE SER 'backups'
                      carregarBackups();
                    }}
                  >
                    <Database size={20} /> Gestão de Backups
                  </button>
                )}

              </>
            )}
          </nav>

          <div className="auth-panel">
            {!sessao ? (
              <button className="btn-auth login" onClick={() => setModalLoginAberto(true)}>
                <Lock size={18} /> Acesso Restrito
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: '#857870', marginBottom: '10px' }}>Logado como: <strong>{sessao.username}</strong></p>
                <button className="btn-auth logout" onClick={fazerLogout}>
                  <LogOut size={18} /> Encerrar Sessão
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="main-viewport">
          <div className="content-wrapper">

            {/* ================= ABA MONITORAMENTO (ABERTA) ================= */}
            {aba === 'monitoramento' && (
              <>
                <div className="page-header">
                  <h1 className="page-title">Monitoramento ao Vivo</h1>
                  <p className="page-subtitle">Vigilância automática constante. Sistema aberto para o fluxo da portaria.</p>
                </div>

                <div className="view-flex">
                  <div className="monitor-cam-container">
                    <div className="camera-box">
                      <CameraAcesso modo="auto" webcamRef={webcamRef} />
                      <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '20px', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        <div style={{ width: '6px', height: '6px', background: '#FF4757', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                        REC
                      </div>
                      {alertaEstranho && (
                        <div style={{ position: 'absolute', top: '50px', right: '16px', background: '#A83232', padding: '8px 12px', borderRadius: '8px', color: 'white', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', animation: 'popIn 0.2s ease-out', border: '1px solid #FF4757', boxShadow: '0 4px 12px rgba(168, 50, 50, 0.4)', zIndex: 10 }}>
                          <AlertCircle size={16} /> ESTRANHO DETECTADO
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="logs-container">
                    <div className="stat-card">
                      <div style={{ background: '#FDF6F3', padding: '12px', borderRadius: '12px', color: '#C07D5E' }}><Users size={24} /></div>
                      <div>
                        <div className="stat-number">{usuarios.filter(u => u.inside === 1).length}</div>
                        <div className="stat-label">Pessoas no Prédio</div>
                      </div>
                    </div>

                    <div className="ui-card logs-panel">
                      <div className="logs-header">
                        <h3 style={{ fontSize: '1.05rem', color: '#3A312B' }}>Últimos Acessos</h3>
                        <button onClick={() => setOcultarLogs(!ocultarLogs)} style={{ fontSize: '0.75rem', padding: '6px 10px', borderRadius: '8px', border: '1px solid #EAE4DD', background: '#FAFAFA', color: '#857870', cursor: 'pointer', fontWeight: '600' }}>
                          {ocultarLogs ? 'Restaurar Tela' : 'Ocultar Logs'}
                        </button>
                      </div>

                      <div className="logs-list">
                        {!ocultarLogs && logs.length > 0 ? logs.map(log => (
                          <div key={log.id} className="log-item">
                            <span style={{ fontWeight: '600', color: '#3A312B', fontSize: '0.9rem' }}>{log.user_name}</span>
                            <span className="tag" style={{
                              // Se for PANICO ou entry, ele entende como entrada. Caso contrário, saída.
                              backgroundColor: log.event_type === 'PANICO' ? '#F1C40F' : (log.event_type === 'entry' ? '#E8F3EB' : '#FDECEC'),
                              color: log.event_type === 'PANICO' ? '#000' : (log.event_type === 'entry' ? '#2C6B3E' : '#A83232'),
                              fontSize: '0.7rem',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              fontWeight: '700'
                            }}>
                              {log.event_type === 'PANICO' ? 'ENTRADA (ALERTA)' : (log.event_type === 'entry' ? 'ENTRADA' : 'SAÍDA')}
                            </span>
                          </div>
                        )) : !ocultarLogs && (
                          <div style={{ textAlign: 'center', color: '#A89F96', padding: '15px 0', fontSize: '0.85rem' }}>Nenhum acesso registrado.</div>
                        )}

                        {ocultarLogs && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#A89F96', gap: '8px', padding: '20px 0' }}>
                            <CheckCircle2 size={28} opacity={0.5} />
                            <span style={{ fontSize: '0.85rem' }}>Logs ocultados da tela.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ================= ABA CADASTRO (PROTEGIDA) ================= */}
            {aba === 'cadastro' && sessao && (
              <>
                <div className="page-header">
                  <h1 className="page-title">Novo Registro</h1>
                  <p className="page-subtitle">Acesso restrito. Cadastre moradores, visitantes ou prestadores.</p>
                </div>

                <div className="ui-card cadastro-flex">
                  <form className="form-section" onSubmit={salvarNovoRegistro}>
                    <div className="input-row">
                      <div className="field-group">
                        <label>Tipo de Acesso</label>
                        <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                          <option value="morador">Morador</option>
                          <option value="visitante">Visitante</option>
                          <option value="prestador">Prestador de Serviço</option>
                        </select>
                      </div>
                      <div className="field-group">
                        <label>Documento (RG/CPF)</label>
                        <input placeholder="000.000.000-00" value={form.doc} onChange={e => setForm({ ...form, doc: e.target.value })} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                        Apartamento / Unidade
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: 204B ou 101"
                        value={form.unidade}
                        onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                      />
                    </div>

                    <div className="field-group">
                      <label>Nome Completo</label>
                      <input
                        placeholder="Digite o nome completo"
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        required
                      />
                    </div>

                    <div className="input-row">
                      {form.tipo === 'morador' && (
                        <div className="field-group">
                          <label>Placa do Veículo</label>
                          <input
                            placeholder="Opcional"
                            value={form.placa}
                            onChange={e => setForm({ ...form, placa: e.target.value })}
                          />
                        </div>
                      )}

                      {(form.tipo === 'visitante' || form.tipo === 'prestador') && (
                        <div className="field-group">
                          <label>Autorizado por (Nome)</label>
                          <input
                            placeholder="Morador responsável"
                            value={form.visita_para}
                            onChange={e => setForm({ ...form, visita_para: e.target.value })}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {form.tipo === 'prestador' && (
                      <div className="field-group">
                        <label>Empresa Representada</label>
                        <input placeholder="Ex: Enel, Claro, Manutenção..." value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} />
                      </div>
                    )}

                    <button type="submit" className="btn-primary">Finalizar Cadastro Seguro</button>
                  </form>

                  <div className="biometria-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#857870', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <Search size={16} /> Biometria Facial
                    </div>
                    <div className="camera-mask">
                      <CameraAcesso webcamRef={webcamCadastroRef} />
                    </div>
                    <button type="button" className={`btn-capturar ${fotoConfirmada ? 'success' : ''}`} onClick={capturarFotoCadastro}>
                      {fotoConfirmada ? <CheckCircle2 size={18} /> : <Camera size={18} />}
                      {fotoConfirmada ? 'FOTO CAPTURADA' : 'CAPTURAR ROSTO'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ================= ABA BANCO DE DADOS (PROTEGIDA) ================= */}
            {aba === 'banco' && sessao && (
              <>
                <div className="page-header">
                  <h1 className="page-title">Pessoas Cadastradas</h1>
                  <p className="page-subtitle">Acesso restrito. Gerenciamento de identidades e biometrias.</p>
                </div>

                {/* COLOQUE ESTE BLOCO AQUI */}
                <button
                  onClick={() => setMonitoramentoAtivo(!monitoramentoAtivo)}
                  className="btn-capturar"
                  style={{
                    width: 'fit-content',
                    padding: '8px 16px',
                    marginBottom: '20px',
                    backgroundColor: monitoramentoAtivo ? '#2C6B3E' : '#A83232'
                  }}
                >
                  {monitoramentoAtivo ? '🟢 Monitoramento Ativo' : '🔴 Monitoramento Pausado'}
                </button>

                <div className="db-list">
                  {usuarios.map(u => (
                    <div key={u.id} className="user-row">
                      <div className="user-info-wrapper">
                        {u.foto ? (
                          <img src={u.foto} alt="Biometria" className="user-avatar" />
                        ) : (
                          <div className="user-avatar-placeholder"><User size={24} /></div>
                        )}
                        <div className="user-details">
                          <h4>{u.name}</h4>
                          <div className="user-meta">
                            <span className="badge-tipo">{u.type}</span>
                            {u.doc && <span>Doc: {u.doc}</span>}
                            {u.obs && <span>• {u.obs}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="row-actions">
                        <button onClick={() => setUsuarioParaAtualizar(u)} className="btn-icon edit" title="Atualizar Biometria">
                          <Camera size={20} />
                        </button>
                        <button onClick={() => deletarUsuario(u.id)} className="btn-icon delete" title="Excluir Registro">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {usuarios.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#A89F96', background: 'white', borderRadius: '16px', border: '1px dashed #EAE4DD' }}>
                      <AlertCircle size={36} opacity={0.3} style={{ marginBottom: '12px' }} />
                      <p style={{ fontSize: '0.9rem' }}>Nenhuma pessoa cadastrada na base de dados.</p>
                    </div>
                  )}
                </div>
                {/* --- NOVA SEÇÃO: BACKUP VISUAL DE ACESSOS --- */}
                <div style={{ marginTop: '50px', borderTop: '2px solid #EAE4DD', paddingTop: '30px' }}>
                  <h2 className="page-title" style={{ fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Database size={22} /> Galeria de Histórico (Backup)
                  </h2>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '20px'
                  }}>
                    {/* Filtramos apenas os logs que possuem foto capturada */}
                    {logs.filter(log => log.snapshot).map(log => (
                      <div key={log.id} className="ui-card" style={{ padding: '10px', textAlign: 'center', backgroundColor: '#FFF', position: 'relative' }}>

                        {/* LIXEIRA: Aparece sobre a foto apenas para Admin */}
                        {role === 'admin' && sessao && (
                          <button
                            onClick={() => excluirLog(log.id)}
                            style={{
                              position: 'absolute',
                              top: '15px',
                              right: '15px',
                              background: '#3A312B',
                              color: '#F5F5F0',
                              border: 'none',
                              borderRadius: '4px',
                              width: '26px',
                              height: '26px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#E63946'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#3A312B'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <img
                          src={log.snapshot}
                          alt="Acesso"
                          style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                        />
                        {/* NOME E HORÁRIO NA GALERIA */}
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#3A312B' }}>{log.user_name}</div>
                        <div style={{ fontSize: '0.65rem', color: '#857870', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginTop: '2px' }}>
                          <Clock size={10} /> {log.timestamp}
                        </div>

                        <div style={{ marginTop: '5px' }}>
                          <span className="tag" style={{
                            fontSize: '0.65rem',
                            backgroundColor: log.event_type === 'PANICO' ? '#F1C40F' : (log.event_type === 'entry' ? '#27ae60' : '#e74c3c'),
                            color: log.event_type === 'PANICO' ? '#000' : '#fff',
                            padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold'
                          }}>
                            {log.event_type === 'PANICO' ? 'ENTROU (ALERTA)' : (log.event_type === 'entry' ? 'ENTROU' : 'SAIU')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Substitua sessao?.role por apenas role */}
            {aba === 'backups' && role === 'admin' && (
              <>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h1 className="page-title">Gestão de Backups</h1>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-primary" style={{ width: 'auto', background: '#3A312B' }} onClick={alterarSenha}>
                      <Lock size={18} style={{ marginRight: '8px' }} /> Alterar Senhas
                    </button>
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={criarBackup}>
                      + Gerar Novo Backup
                    </button>
                  </div>
                </div>
                {/* ... resto da listagem de backups ... */}

                <div className="db-list">
                  {backups.map(b => (
                    <div key={b.filename} className="user-row">
                      <div className="user-info-wrapper">
                        <div className="user-avatar-placeholder" style={{ background: '#FDF6F3', color: '#C07D5E' }}>
                          <Database size={24} />
                        </div>
                        <div className="user-details">
                          <h4>{b.filename}</h4>
                          <div className="user-meta">
                            <span>{new Date(b.created_at).toLocaleString()}</span>
                            <span>• {(b.size_bytes / 1024).toFixed(2)} KB</span>
                          </div>
                        </div>
                      </div>

                      <div className="row-actions">
                        <button onClick={() => baixarBackup(b.filename)} className="btn-icon" style={{ color: '#2C6B3E' }} title="Baixar Backup">
                          BAIXAR
                        </button>
                        <button onClick={() => restaurarBackup(b.filename)} className="btn-icon" style={{ color: '#E65100' }} title="Restaurar Backup">
                          RESTAURAR
                        </button>
                        <button onClick={() => deletarBackup(b.filename)} className="btn-icon delete" title="Excluir Permanentemente">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {backups.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#A89F96', background: 'white', borderRadius: '16px', border: '1px dashed #EAE4DD' }}>
                      <Database size={36} opacity={0.3} style={{ marginBottom: '12px' }} />
                      <p style={{ fontSize: '0.9rem' }}>Nenhum backup encontrado no servidor.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ================= MODAL LOGIN SISTEMA ================= */}
            {modalLoginAberto && (
              <div className="modal-backdrop">
                <div className="modal-card" style={{ padding: '40px 30px' }}>
                  <button className="btn-close-modal" onClick={() => setModalLoginAberto(false)}><X size={18} /></button>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: '#3A312B' }}>
                    <Lock size={48} strokeWidth={1.5} />
                  </div>
                  <h2 style={{ marginBottom: '8px' }}>Acesso Restrito</h2>
                  <p style={{ marginBottom: '30px' }}>Insira suas credenciais corporativas.</p>

                  <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="field-group" style={{ textAlign: 'left' }}>
                      <label>Usuário</label>
                      <input
                        type="text"
                        required
                        placeholder="admin ou porteiro"
                        value={loginForm.username}
                        onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                      />
                    </div>
                    <div className="field-group" style={{ textAlign: 'left' }}>
                      <label>Senha de Acesso</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                      Autenticar
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ================= MODAL PORTEIRO (RECONHECIMENTO IA) ================= */}
            {targetUser && (
              <div className="modal-backdrop">
                <div className="modal-card">
                  <button className="btn-close-modal" onClick={() => setTargetUser(null)}><X size={18} /></button>

                  <img src={targetUser.foto} className="modal-avatar" alt="Face Reconhecida" />
                  <h2>{targetUser.name}</h2>
                  <div style={{ display: 'inline-block', background: '#F8F6F4', padding: '4px 10px', borderRadius: '8px', color: '#857870', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', border: '1px solid #EAE4DD' }}>
                    {targetUser.type}
                  </div>
                  <p>{targetUser.obs}</p>

                  <div className="modal-actions" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '20px'
                  }}>
                    <button
                      className="btn-modal entrada"
                      disabled={targetUser.inside === 1 || enviando}
                      onClick={async () => {
                        if (enviando) return;
                        setEnviando(true);

                        // 📸 Captura a foto da entrada
                        const fotoEntrada = capturarSnapshot();

                        try {
                          const res = await api.post(`/api/users/${targetUser.id}/entrada`, { snapshot: fotoEntrada });
                          console.log("Entrada registrada com sucesso no sistema:", res.data);
                          alert("Entrada registrada com sucesso!");
                          setTargetUser(null);
                          carregarDados();
                        } catch (err) {
                          alert("Erro ao registrar entrada");
                        } finally {
                          setEnviando(false);
                        }
                      }}
                    >
                      {enviando ? 'PROCESSANDO...' : 'ENTRADA'}
                    </button>

                    <button
                      className="btn-modal saida"
                      disabled={targetUser.inside === 0 || enviando}
                      onClick={async () => {
                        if (enviando) return;
                        setEnviando(true);

                        // 📸 Captura a foto da saída! Faltava isso aqui.
                        const fotoSaida = capturarSnapshot();

                        try {
                          await api.post(`/api/users/${targetUser.id}/saida`, { snapshot: fotoSaida });
                          alert("Saída registrada com foto!");
                          setTargetUser(null);
                          carregarDados();
                        } catch (err) {
                          alert("Erro ao registrar saída.");
                        } finally {
                          setEnviando(false);
                        }
                      }}
                    >
                      {enviando ? "PROCESSANDO..." : "SAÍDA"}
                    </button>

                    <button
                      className="btn-modal"
                      disabled={targetUser.inside === 1 || enviando}
                      style={{
                        background: '#1a1a1a',
                        color: '#ff4757',
                        border: '1px solid #331a1a',
                        marginTop: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}
                      onClick={async () => {
                        if (window.confirm("⚠️ ALERTA DE COAÇÃO: Deseja liberar a entrada e avisar a central de segurança?")) {
                          setEnviando(true);
                          const foto = capturarSnapshot();
                          try {
                            await api.post(`/api/users/${targetUser.id}/entrada`, { snapshot: foto, panic: true });
                            alert("Entrada liberada. Alerta de pânico enviado silenciosamente!");
                            setTargetUser(null);
                            carregarDados();
                          } catch (err) {
                            alert("Erro ao processar pânico");
                          } finally {
                            setEnviando(false);
                          }
                        }
                      }}
                    >
                      ⚠️ ENTRADA SOS
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= MODAL ATUALIZAR BIOMETRIA (PROTEGIDA) ================= */}
            {usuarioParaAtualizar && sessao && (
              <div className="modal-backdrop">
                <div className="modal-card" style={{ width: '100%', maxWidth: '420px' }}>
                  <button className="btn-close-modal" onClick={() => { setUsuarioParaAtualizar(null); setNovaFotoCapturada(null); }}><X size={18} /></button>

                  <h2 style={{ marginBottom: '16px', fontSize: '1.3rem' }}>Atualizar Biometria</h2>
                  <p style={{ marginBottom: '20px', color: '#857870', fontSize: '0.9rem' }}>Capture o novo rosto para <strong>{usuarioParaAtualizar.name}</strong></p>

                  <div className="camera-mask" style={{ marginBottom: '16px' }}>
                    <CameraAcesso webcamRef={webcamAtualizarRef} />
                  </div>

                  <button type="button" className={`btn-capturar ${novaFotoCapturada ? 'success' : ''}`} onClick={capturarNovaFoto} style={{ marginBottom: '16px' }}>
                    {novaFotoCapturada ? <CheckCircle2 size={18} /> : <Camera size={18} />}
                    {novaFotoCapturada ? 'NOVA FOTO CAPTURADA' : 'CAPTURAR NOVO ROSTO'}
                  </button>

                  <button className="btn-primary" style={{ width: '100%', margin: 0 }} onClick={confirmarAtualizacaoFoto}>
                    Salvar Atualização Segura
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

export default App;