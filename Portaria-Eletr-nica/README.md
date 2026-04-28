
# 🏢 Portaria Inteligente - Biometria Facial & Interfone Digital

Sistema de controle de acesso de alta segurança desenvolvido para a disciplina de **Segurança de Sistemas**. Integra Inteligência Artificial para reconhecimento facial, automação de notificações via Telegram e protocolos de entrada sob coação.

---

## 🌟 Funcionalidades Principais

### 🛡️ Segurança e Biometria
* **Reconhecimento Facial:** Identificação automática de usuários via webcam.
* **Entrada de Alerta (SOS):** Botão discreto de "Acesso com Observação". Registra o evento como **ENTRADA (ALERTA)** em amarelo e notifica o administrador silenciosamente.
* **Monitoramento de Estranhos:** Alerta visual quando um rosto não cadastrado é detectado.

### 📱 Interfone Digital (Telegram)
* **Notificações Automáticas:** O morador recebe uma foto no Telegram quando um visitante é identificado.
* **Vínculo por CPF:** Moradores vinculam seus perfis ao bot informando apenas o CPF cadastrado.
* **Alerta Crítico:** Notificação imediata ao Admin em caso de acionamento do botão de pânico.

### 📊 Gestão e Auditoria
* **Galeria de Histórico:** Logs visuais com Nome, Foto, Horário (Relógio) e status colorido.
* **Dashboard de Estatísticas:** Contadores de fluxo e usuários ativos.
* **Sistema de Backups:** Geração de pontos de restauração e download (Exclusivo Admin).

---

## 📂 Estrutura do Repositório

```text
topicos/
├── Portaria-Eletr-nica/    # Backend (Python/Flask/IA)
│   ├── app.py              # Servidor Principal
│   ├── portaria.db         # Banco de Dados SQLite
│   └── backups/            # Pasta de Segurança
└── front/                  # Frontend (React.js/Vite)
    ├── src/
    │   └── App.jsx         # Interface do Porteiro
    └── package.json
```

---

## 🛠️ Como Rodar o Projeto

### 1. Backend
```bash
cd Portaria-Eletr-nica
python -m venv venv
# Ativar venv: venv\Scripts\activate (Windows) ou source venv/bin/activate (Linux)
pip install flask flask-cors face_recognition numpy requests
python app.py
```

### 2. Frontend
```bash
cd front
npm install
npm run dev
```

---

## 🌐 Configurações de API

No arquivo `app.py`, configure:
* **TELEGRAM_TOKEN:** Gerado via `@BotFather`.
* **ADMIN_CHAT_ID:** Seu ID pessoal via `@userinfobot`.

---

## 📡 Documentação da API

### Usuários e Acessos
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| **GET** | `/api/users` | Lista todos os usuários cadastrados |
| **POST** | `/api/users` | Cadastro de nova biometria facial |
| **POST** | `/api/users/:id/entrada` | Registra entrada (aceita flag panic) |
| **POST** | `/api/users/:id/saida` | Registra saída com snapshot |

### Histórico e Sistema
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| **GET** | `/api/log` | Retorna histórico completo com fotos |
| **GET** | `/api/stats` | Estatísticas e contagem de fluxo |
| **POST** | `/api/backups/create` | Gera novo ponto de restauração |

