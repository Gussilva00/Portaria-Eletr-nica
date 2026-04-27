🏢 Portaria Inteligente - Biometria Facial & Interfone DigitalEste projeto é um sistema de controle de acesso de alta segurança desenvolvido para a disciplina de Segurança de Sistemas. Ele utiliza Inteligência Artificial para reconhecimento facial, integração com Telegram para notificações em tempo real e um protocolo de segurança para entradas sob coação (Pânico).Status do Projeto: 🚀 Finalizado para AV1 (Abril/2026)🌟 Funcionalidades Principais🛡️ Segurança e BiometriaReconhecimento Facial: Identificação automática de moradores e visitantes via webcam.Entrada de Alerta (SOS): Botão discreto de "Acesso com Observação". Registra o evento como ENTRADA (ALERTA) em amarelo e envia uma notificação silenciosa com foto para o administrador.Monitoramento de Estranhos: Alerta visual quando um rosto não cadastrado permanece na câmera.📱 Interfone Digital (Telegram)Notificações em Tempo Real: O morador recebe uma foto no Telegram sempre que um visitante é identificado.Vínculo por CPF: Moradores podem se cadastrar no bot informando apenas o CPF cadastrado no sistema.Alerta Crítico: Notificação imediata ao Admin em caso de acionamento do botão de pânico.📊 Gestão e Auditoria (Baseado no sistema original)Galeria de Histórico: Logs visuais com Nome, Foto, Horário (Relógio) e status do acesso.Dashboard de Estatísticas: Contadores de fluxo de pessoas e tipos de usuários ativos.Sistema de Backups: Geração de pontos de restauração do banco de dados e download seguro (Exclusivo Admin).📂 Estrutura do RepositórioBashtopicos/
├── Portaria-Eletr-nica/    # Backend (Python/Flask/IA)
│   ├── app.py              # Servidor Principal
│   ├── portaria.db         # Banco de Dados SQLite
│   └── backups/            # Pasta de Segurança
└── front/                  # Frontend (React.js/Vite)
    ├── src/
    │   └── App.jsx         # Interface do Porteiro
    └── package.json
🛠️ Como Rodar o Projeto1. Configurando o BackendBashcd Portaria-Eletr-nica
python -m venv venv
# Ativar venv: source venv/bin/activate (Linux/Mac) ou venv\Scripts\activate (Windows)
pip install flask flask-cors face_recognition numpy requests
python app.py
2. Configurando o FrontendBashcd front
npm install
npm run dev
🌐 Configurações de API (Integrações)No arquivo app.py, configure as seguintes chaves para habilitar a segurança:TELEGRAM_TOKEN: Gerado via @BotFather.ADMIN_CHAT_ID: Seu ID pessoal obtido via @userinfobot.Ngrok (Para uso em VM): Caso rode fora da rede local, utilize ngrok http 5000.📡 Documentação da APIUsuários e AcessosMétodoRotaDescriçãoGET/api/usersLista todos os usuários cadastradosPOST/api/usersCadastro de nova biometria facialPOST/api/users/:id/entradaRegistra entrada (aceita flag panic)POST/api/users/:id/saidaRegistra saída com snapshotHistórico e SistemaMétodoRotaDescriçãoGET/api/logRetorna histórico completo com fotosDELETE/api/logs/:idRemove registro (Admin apenas)GET/api/statsEstatísticas e contagem de fluxoPOST/api/backups/createGera novo ponto de restauração
