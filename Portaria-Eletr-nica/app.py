from flask import Flask, json, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
import io
import base64
import numpy as np
import face_recognition
import secrets
from datetime import datetime
import requests

app = Flask(__name__, static_folder='static')
CORS(app)

TELEGRAM_TOKEN = "8341737770:AAHsxy-5iVchqVpu-4D4AVNGBl5hAFZfyGk"
ADMIN_CHAT_ID = "1322939485"

def enviar_notificacao_telegram(mensagem, foto_base64=None):
    try:
        url_text = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        payload = {
            "chat_id": ADMIN_CHAT_ID,
            "text": f"<b>🏢 PORTARIA TOPICOS</b>\n{mensagem}",
            "parse_mode": "HTML"
        }
        requests.post(url_text, json=payload)

        if foto_base64:
            url_photo = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"
            if "," in foto_base64:
                foto_base64 = foto_base64.split(",")[1]
            img_bytes = base64.b64decode(foto_base64)
            files = {'photo': ('snapshot.jpg', io.BytesIO(img_bytes))}
            requests.post(url_photo, data={'chat_id': ADMIN_CHAT_ID}, files=files)
    except Exception as e:
        print(f"Erro Telegram: {e}")
        
def enviar_notificacao_telegram(mensagem, foto_base64=None):
    try:
        url_text = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        payload = {
            "chat_id": ADMIN_CHAT_ID,
            "text": f"<b>🏢 PORTARIA TOPICOS</b>\n{mensagem}",
            "parse_mode": "HTML"
        }
        requests.post(url_text, json=payload)

        if foto_base64:
            url_photo = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"
            if "," in foto_base64:
                foto_base64 = foto_base64.split(",")[1]
            img_bytes = base64.b64decode(foto_base64)
            requests.post(url_photo, data={'chat_id': ADMIN_CHAT_ID}, files={'photo': ('snapshot.jpg', io.BytesIO(img_bytes))})
    except Exception as e:
        print(f"Erro Telegram Admin: {e}")

def enviar_notificacao_especifica(chat_id_destino, mensagem, foto_base64=None):
    try:
        url_text = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        payload = {
            "chat_id": chat_id_destino,
            "text": f"<b>🏠 INTERFONE DIGITAL</b>\n{mensagem}",
            "parse_mode": "HTML"
        }
        requests.post(url_text, json=payload)

        if foto_base64:
            url_photo = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"
            if "," in foto_base64:
                foto_base64 = foto_base64.split(",")[1]
            img_bytes = base64.b64decode(foto_base64)
            requests.post(url_photo, data={'chat_id': chat_id_destino}, files={'photo': ('snapshot.jpg', io.BytesIO(img_bytes))})
    except Exception as e:
        print(f"Erro Telegram Morador: {e}")

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DB_PATH    = os.path.join(BASE_DIR, 'portaria.db')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')

os.makedirs(BACKUP_DIR, exist_ok=True)

# ── DB helpers ────────────────────────────────────────────

def get_db():
    # O timeout=20 faz o Python esperar o banco destravar por 20 segundos antes de dar erro
    conn = sqlite3.connect('portaria.db', timeout=20)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        # 1. Criação de todas as tabelas
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                name           TEXT    NOT NULL,
                doc            TEXT,
                type           TEXT    NOT NULL DEFAULT 'visitor',
                unidade        TEXT,
                chat_id        TEXT,
                obs            TEXT,
                foto           TEXT,
                face_encoding  TEXT,
                panic_encoding TEXT,
                is_restricted  INTEGER DEFAULT 0,
                inside         INTEGER NOT NULL DEFAULT 0,
                created_at     TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS access_log (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER,
                user_name  TEXT    NOT NULL,
                user_type  TEXT    NOT NULL,
                event_type TEXT    NOT NULL,
                snapshot   TEXT,
                is_panic   INTEGER DEFAULT 0,
                timestamp  TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sys_users (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                username  TEXT UNIQUE NOT NULL,
                password  TEXT NOT NULL,
                role      TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                token      TEXT NOT NULL,
                role       TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')

        # 2. Criação automática dos usuários do sistema (Admin e Porteiro)
        from werkzeug.security import generate_password_hash
        
        # Verifica e cria o Admin
        admin_exists = conn.execute("SELECT * FROM sys_users WHERE username = 'admin'").fetchone()
        if not admin_exists:
            conn.execute("INSERT INTO sys_users (username, password, role) VALUES (?, ?, ?)",
                         ('admin', generate_password_hash('admin123'), 'admin'))
            print("✅ Usuário ADMIN criado na tabela sys_users.")

        # Verifica e cria o Porteiro
        port_exists = conn.execute("SELECT * FROM sys_users WHERE username = 'porteiro'").fetchone()
        if not port_exists:
            conn.execute("INSERT INTO sys_users (username, password, role) VALUES (?, ?, ?)",
                         ('porteiro', generate_password_hash('port123'), 'porteiro'))
            print("✅ Usuário PORTEIRO criado na tabela sys_users.")
            
        conn.commit()
        
        # 2. Garantia de que ADMIN e PORTEIRO sempre existam
        # Criar Admin
        admin = conn.execute("SELECT * FROM sys_users WHERE username = 'admin'").fetchone()
        if not admin:
            conn.execute("INSERT INTO sys_users (username, password, role) VALUES (?, ?, ?)",
                         ('admin', 'admin123', 'admin'))
            print("✅ Usuário ADMIN criado.")

        # Criar Porteiro
        porteiro = conn.execute("SELECT * FROM sys_users WHERE username = 'porteiro'").fetchone()
        if not porteiro:
            conn.execute("INSERT INTO sys_users (username, password, role) VALUES (?, ?, ?)",
                         ('porteiro', 'porteiro123', 'porteiro'))
            print("✅ Usuário PORTEIRO criado.")
            
        conn.commit()
        print("🚀 Banco de dados pronto para uso!")
        
        # Mantém a criação automática do Admin e Porteiro se o banco estiver vazio
        cursor = conn.execute("SELECT COUNT(*) FROM sys_users")
        if cursor.fetchone()[0] == 0:
            from werkzeug.security import generate_password_hash
            conn.execute("INSERT INTO sys_users (username, password, role) VALUES (?, ?, ?)",
                         ('admin', generate_password_hash('admin123'), 'admin'))
            conn.execute("INSERT INTO sys_users (username, password, role) VALUES (?, ?, ?)",
                         ('porteiro', generate_password_hash('port123'), 'porteiro'))

# ── SISTEMA DE LOGIN E SEGURANÇA ──────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    with get_db() as conn:
        # AGORA BUSCAMOS NA TABELA DE SISTEMA
        user = conn.execute("SELECT * FROM sys_users WHERE username = ?", (username,)).fetchone()
        
        if user and check_password_hash(user['password'], password):
            token = secrets.token_hex(16)
            
            # --- A LINHA QUE FALTAVA ESTÁ AQUI EMBAIXO ---
            # Salva o token no banco para as outras rotas o reconhecerem!
            conn.execute("INSERT INTO sessions (token, role) VALUES (?, ?)", (token, user['role']))
            conn.commit()
            # ----------------------------------------------

            return jsonify({
                "token": token,
                "role": user['role'],
                "name": user['username'] # Como sys_users não tem 'name', usamos o username
            }), 200
    
    return jsonify({"error": "Credenciais inválidas"}), 401

def get_auth_role(request):
    auth_header = request.headers.get('Authorization')
    
    # Se não mandou crachá ou mandou vazio, é visitante
    if not auth_header or not auth_header.startswith('Bearer ') or auth_header == 'Bearer undefined':
        return 'visitor'
    
    token = auth_header.split(' ')[1]
    
    with get_db() as conn:
        # O Python tem que procurar esse token na tabela sessions!
        session = conn.execute("SELECT role FROM sessions WHERE token = ?", (token,)).fetchone()
        if session:
            return session['role']
            
    return 'visitor'

def check_auth(req):
    return get_auth_role(req) is not None

# ── Helper de Biometria ──────────────────────────

def process_face(base64_str):
    try:
        if not base64_str or "," not in base64_str: return None
        img_data = base64.b64decode(base64_str.split(",")[1])
        img = face_recognition.load_image_file(io.BytesIO(img_data))
        enc = face_recognition.face_encodings(img)
        return ",".join(map(str, enc[0])) if enc else None
    except Exception as e:
        return None

@app.route('/api/recognize', methods=['POST'])
def recognize():
    data = request.json or {}
    foto = data.get('foto') 
    if not foto: return jsonify({'error': 'Foto ausente'}), 400

    encoding_raw = process_face(foto)
    # Se retornar None, não tem nenhum rosto humano na imagem
    if not encoding_raw: return jsonify({'match': False, 'face_detected': False}), 200

    current_enc = np.fromstring(encoding_raw, sep=',')
    with get_db() as conn:
        users = conn.execute("SELECT * FROM users WHERE face_encoding IS NOT NULL").fetchall()
        for u in users:
            saved_enc = np.fromstring(u['face_encoding'], sep=',')
            if face_recognition.compare_faces([saved_enc], current_enc, tolerance=0.5)[0]:
                return jsonify({'match': True, 'user': dict(u)})
                
    # Se o código chegou até aqui, ele leu um rosto humano, mas não achou no banco!
    return jsonify({'match': False, 'face_detected': True, 'unknown_face': True}), 200

# Mude de: @app.route('/api/users', methods=['POST'])
# Para:
@app.route('/api/users', methods=['GET', 'POST'])
def handle_users():
    if request.method == 'GET':
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM users ORDER BY name").fetchall()
            return jsonify([dict(r) for r in rows])

    if request.method == 'POST':
        # 1. Pega o crachá (token) enviado pelo React
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Sessão expirada (sem header)'}), 401
        
        token = auth_header.split(' ')[1]
        
        with get_db() as conn:
            # 2. Verifica se o crachá existe na tabela de sessões e qual o cargo
            session = conn.execute("SELECT role FROM sessions WHERE token = ?", (token,)).fetchone()
            
            # 3. Se não achar o token ou não for admin/porteiro, bloqueia!
            if not session or session['role'] not in ['admin', 'porteiro']:
                return jsonify({'error': 'Sessão expirada ou sem permissão'}), 401
        
        # ... o resto do seu código de cadastro continua aqui embaixo (data = request.json, etc) ...
        # -----------------------------------

        data = request.json or {}
        # Aceita 'nome' ou 'name' para não dar erro 400
        name = (data.get('nome') or data.get('name', '')).strip()
        foto = data.get('foto') or data.get('photo')

        if not name or not foto:
            return jsonify({'error': 'Nome e foto são obrigatórios'}), 400

        # ... resto do seu código de insert ...

        unidade = data.get('unidade', '')
        enc_str = process_face(foto)

        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO users (name, doc, type, obs, foto, face_encoding, unidade, inside, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (name, data.get('doc', ''), data.get('tipo', 'visitor'),
                 data.get('obs', ''), foto, enc_str, unidade, 0, datetime.now().isoformat())
            )
            conn.commit()
        return jsonify({"success": True}), 201
    
@app.route('/api/users/<int:uid>', methods=['DELETE'])
def delete_user(uid):
    # 1. Pega o crachá
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Sessão expirada (sem header)'}), 401
    
    token = auth_header.split(' ')[1]
    
    with get_db() as conn:
        # 2. Confere se o token existe e se o usuário é admin
        session = conn.execute("SELECT role FROM sessions WHERE token = ?", (token,)).fetchone()
        
        if not session or session['role'] != 'admin':
            return jsonify({'error': 'Sessão expirada ou sem permissão para excluir'}), 401
        
        # 3. Exclui o usuário
        conn.execute("DELETE FROM users WHERE id=?", (uid,))
        conn.commit()
        
    return jsonify({'ok': True}), 200

@app.route('/api/users/<int:uid>/foto', methods=['PUT'])
def update_user_photo(uid):
    if not check_auth(request): return jsonify({'error': 'Acesso Negado'}), 401
    data = request.json or {}
    foto = data.get('foto')
    if not foto: return jsonify({'error': 'Foto ausente'}), 400
    enc_str = process_face(foto)
    with get_db() as conn:
        conn.execute("UPDATE users SET foto=?, face_encoding=? WHERE id=?", (foto, enc_str, uid))
        conn.commit()
    return jsonify({'status': 'ok'})


# NOVAS ROTAS ESPECÍFICAS DE ENTRADA E SAÍDA
# NOVAS ROTAS ESPECÍFICAS DE ENTRADA E SAÍDA
@app.route('/api/users/<int:user_id>/entrada', methods=['POST'])
def registrar_entrada(user_id):
    try:
        data = request.json or {}
        snapshot = data.get('snapshot')
        # 👇 O Python agora escuta se é um evento de pânico
        is_panic = data.get('panic', False) 
        
        data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        
        with get_db() as conn:
            user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not user_row:
                return jsonify({'error': 'Usuário não encontrado'}), 404
            
            user = dict(user_row)
            conn.execute("UPDATE users SET inside = 1 WHERE id = ?", (user_id,))
            
            # Se for pânico, salva no banco de dados com a tag vermelha 'PANICO'
            event_type = 'PANICO' if is_panic else 'entry'
            
            conn.execute(
                "INSERT INTO access_log (user_id, user_name, user_type, event_type, snapshot, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, user['name'], user['type'], event_type, snapshot, data_hora)
            )
            conn.commit()

        # 👇 Lógica de Notificação de Pânico vs Notificação Normal
        if is_panic:
            # Manda o alerta silencioso direto para o Telegram do Admin da Portaria
            msg_panico = f"🚨 <b>ALERTA DE COAÇÃO / PÂNICO</b> 🚨\nO usuário <b>{user['name']}</b> entrou sob ameaça! A polícia deve ser acionada."
            enviar_notificacao_telegram(msg_panico, snapshot)
        else:
            # Lógica normal de interfone para visitantes
            unidade_alvo = user.get('unidade')
            tipo_usuario = str(user.get('type', '')).lower()
            if tipo_usuario in ['visitante', 'prestador'] and unidade_alvo:
                with get_db() as conn:
                    dono = conn.execute("SELECT chat_id FROM users WHERE unidade = ? AND chat_id IS NOT NULL LIMIT 1", (unidade_alvo,)).fetchone()
                    if dono:
                        msg = f"🔔 <b>SOLICITAÇÃO</b>\nO {user['type']} <b>{user['name']}</b> chegou para a unidade {unidade_alvo}."
                        enviar_notificacao_especifica(dono['chat_id'], msg, snapshot)
        
        return jsonify({"success": True})
    except Exception as e:
        print(f"ERRO ENTRADA: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:user_id>/saida', methods=['POST'])
def registrar_saida(user_id):
    try:
        data = request.json or {}
        snapshot = data.get('snapshot') # Pega a foto da saída!
        data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        with get_db() as conn:
            user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not user_row:
                return jsonify({'error': 'Usuário não encontrado'}), 404
            
            user = dict(user_row)
            conn.execute("UPDATE users SET inside = 0 WHERE id = ?", (user_id,))
            
            # Salva o Log COM a foto e a tag 'SAIDA'
            conn.execute(
                "INSERT INTO access_log (user_id, user_name, user_type, event_type, snapshot, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, user['name'], user['type'], 'SAIDA', snapshot, data_hora)
            )
            conn.commit()

        # Notificação Telegram
        unidade_alvo = user.get('unidade')
        tipo_usuario = str(user.get('type', '')).lower()

        if tipo_usuario != 'morador' and unidade_alvo:
            with get_db() as conn:
                dono_row = conn.execute("SELECT chat_id FROM users WHERE unidade = ? AND chat_id IS NOT NULL LIMIT 1", (unidade_alvo,)).fetchone()
                if dono_row:
                    msg = f"🚪 <b>SAÍDA REGISTRADA</b>\nO {user['type']} <b>{user['name']}</b> registrou a saída da unidade {unidade_alvo}."
                    enviar_notificacao_especifica(dono_row['chat_id'], msg, snapshot)
        
        return jsonify({"success": True})

    except Exception as e:
        print(f"ERRO NA SAÍDA: {e}")
        return jsonify({"error": str(e)}), 500
# ── Log e Stats ───────────────────────────────────────────

@app.route('/api/log', methods=['GET'])
def list_log():
    event_type = request.args.get('type', '')
    with get_db() as conn:
        # Adicionei "snapshot" no SELECT abaixo para a galeria de fotos funcionar
        query = "SELECT id, user_name, user_type, event_type, timestamp, snapshot FROM access_log"
        if event_type:
            rows = conn.execute(f"{query} WHERE event_type=? ORDER BY timestamp DESC LIMIT 500", (event_type,)).fetchall()
        else:
            rows = conn.execute(f"{query} ORDER BY timestamp DESC LIMIT 500").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/log', methods=['DELETE'])
def clear_log():
    if not check_auth(request): return jsonify({'error': 'Acesso Negado'}), 401
    with get_db() as conn:
        conn.execute("DELETE FROM access_log")
    return jsonify({'ok': True})

@app.route('/api/stats', methods=['GET'])
def stats():
    today = datetime.now().date().isoformat()
    with get_db() as conn:
        total       = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        inside      = conn.execute("SELECT COUNT(*) FROM users WHERE inside=1").fetchone()[0]
        today_count = conn.execute(
            "SELECT COUNT(*) FROM access_log WHERE timestamp LIKE ?", (f'{today}%',)
        ).fetchone()[0]
    return jsonify({'total': total, 'inside': inside, 'today': today_count})

def _backup_info(filename):
    path = os.path.join(BACKUP_DIR, filename)
    stat = os.stat(path)
    return {
        'filename':   filename,
        'size_bytes': stat.st_size,
        'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
    }

# ── BACKUPS (TOTALMENTE TRANCADOS PARA ADMIN) ────────────

@app.route('/api/backup', methods=['GET'])
def list_backups():
    if get_auth_role(request) != 'admin': return jsonify({'error': 'Acesso restrito ao Admin'}), 403
    files = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.db')], reverse=True)
    return jsonify({'backups': [_backup_info(f) for f in files]})

@app.route('/api/backup', methods=['POST'])
def create_backup():
    if get_auth_role(request) != 'admin': return jsonify({'error': 'Acesso restrito ao Admin'}), 403
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename  = f'portaria_{timestamp}.db'
    dest      = os.path.join(BACKUP_DIR, filename)
    src_conn  = sqlite3.connect(DB_PATH)
    dst_conn  = sqlite3.connect(dest)
    src_conn.backup(dst_conn)
    dst_conn.close(); src_conn.close()
    return jsonify(_backup_info(filename)), 201

@app.route('/api/backup/<filename>/download', methods=['GET'])
def download_backup(filename):
    if get_auth_role(request) != 'admin': return jsonify({'error': 'Acesso restrito ao Admin'}), 403
    safe = os.path.basename(filename)
    path = os.path.join(BACKUP_DIR, safe)
    if not os.path.exists(path):
        return jsonify({'error': 'Backup nao encontrado'}), 404
    return send_file(path, as_attachment=True, download_name=safe)

@app.route('/api/backup/<filename>/restore', methods=['POST'])
def restore_backup(filename):
    if get_auth_role(request) != 'admin': return jsonify({'error': 'Acesso restrito ao Admin'}), 403
    safe = os.path.basename(filename)
    src  = os.path.join(BACKUP_DIR, safe)
    if not os.path.exists(src):
        return jsonify({'error': 'Backup nao encontrado'}), 404
    auto_name = f'pre_restore_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
    auto_path = os.path.join(BACKUP_DIR, auto_name)
    cur  = sqlite3.connect(DB_PATH)
    bk   = sqlite3.connect(auto_path)
    cur.backup(bk)
    bk.close(); cur.close()
    src_conn  = sqlite3.connect(src)
    live_conn = sqlite3.connect(DB_PATH)
    src_conn.backup(live_conn)
    live_conn.close(); src_conn.close()
    return jsonify({'ok': True, 'auto_backup': auto_name})

@app.route('/api/backup/<filename>', methods=['DELETE'])
def delete_backup(filename):
    if get_auth_role(request) != 'admin': return jsonify({'error': 'Acesso restrito ao Admin'}), 403
    safe = os.path.basename(filename)
    path = os.path.join(BACKUP_DIR, safe)
    if not os.path.exists(path):
        return jsonify({'error': 'Backup nao encontrado'}), 404
    os.remove(path)
    return jsonify({'ok': True})

@app.route('/api/admin/update-password', methods=['POST'])
def update_password():
    # Verifica se quem está tentando mudar é admin
    if get_auth_role(request) != 'admin': 
        return jsonify({'error': 'Acesso restrito ao Administrador'}), 403
    
    data = request.json
    target_user = data.get('username') # 'admin' ou 'porteiro'
    new_pwd = data.get('new_password')
    
    if not target_user or not new_pwd:
        return jsonify({'error': 'Dados incompletos'}), 400
        
    try:
        with get_db() as conn:
            hash_novo = generate_password_hash(new_pwd)
            conn.execute("UPDATE sys_users SET password = ? WHERE username = ?", (hash_novo, target_user))
            conn.commit()
        return jsonify({'ok': True, 'message': f'Senha de {target_user} atualizada!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# No final do seu app.py, antes do if __name__
@app.route('/telegram-webhook', methods=['POST'])
def telegram_webhook():
    update = request.json
    if "message" in update:
        chat_id = str(update["message"]["chat"]["id"])
        texto = update["message"].get("text", "").strip()

        # Quando o morador clica em "Começar" ou digita /start
        if texto == "/start":
            msg = "🏠 <b>BEM-VINDO AO INTERFONE DIGITAL</b>\n\nPor favor, digite seu <b>CPF</b> (apenas números) para vincular seu celular ao seu apartamento."
            enviar_notificacao_especifica(chat_id, msg)
            return jsonify({"ok": True})

        # Quando o morador responde com o CPF
        if len(texto) == 11 and texto.isdigit():
            with get_db() as conn:
                morador = conn.execute("SELECT name, unidade FROM users WHERE doc = ?", (texto,)).fetchone()
                if morador:
                    conn.execute("UPDATE users SET chat_id = ? WHERE doc = ?", (chat_id, texto))
                    conn.commit()
                    enviar_notificacao_especifica(chat_id, f"✅ <b>VÍNCULO OK!</b>\nOlá {morador['name']}, você agora é o morador oficial do <b>Apto {morador['unidade']}</b>.")
                else:
                    enviar_notificacao_especifica(chat_id, "❌ CPF não encontrado no sistema da portaria.")
    
    return jsonify({"ok": True})

@app.route('/api/logs/<int:log_id>', methods=['DELETE'])
def delete_log(log_id):
    # 1. Verifica se quem está tentando apagar é ADMIN
    role = get_auth_role(request)
    if role != 'admin':
        return jsonify({'error': 'Acesso negado'}), 403

    try:
        with get_db() as conn:
            # 2. Tenta deletar o registro do banco
            conn.execute("DELETE FROM access_log WHERE id = ?", (log_id,))
            conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ── Frontend Original ────────────

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)