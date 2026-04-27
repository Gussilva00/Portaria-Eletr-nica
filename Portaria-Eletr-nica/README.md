# Portaria Eletrônica

App web local com banco SQLite para controle de entrada e saída.

## Estrutura

```
portaria/
├── app.py              # Backend Flask + API REST
├── requirements.txt    # Dependências Python
├── portaria.db         # Banco SQLite (criado automaticamente)
├── backups/            # Pasta de backups (criada automaticamente)
└── static/
    ├── index.html      # HTML (estrutura)
    ├── style.css       # Estilos
    └── app.js          # Lógica JavaScript
```

## Como rodar

```bash
pip install -r requirements.txt
python app.py
# Acesse: http://localhost:5000
```

## API

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/users | Lista usuários (aceita ?q=busca) |
| POST | /api/users | Cadastra usuário |
| DELETE | /api/users/:id | Remove usuário |
| POST | /api/users/:id/toggle | Registra entrada ou saída |

### Histórico
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/log | Histórico (aceita ?type=entry/exit) |
| DELETE | /api/log | Limpa histórico |

### Stats
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/stats | Totais e contadores |

### Backups
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/backup | Lista backups disponíveis |
| POST | /api/backup | Cria novo backup |
| GET | /api/backup/:filename/download | Baixa arquivo de backup |
| POST | /api/backup/:filename/restore | Restaura backup (salva auto-backup antes) |
| DELETE | /api/backup/:filename | Exclui backup |
