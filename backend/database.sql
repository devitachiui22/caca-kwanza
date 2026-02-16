-- =========================================================
-- CAÇAKWANZA - SCHEMA DE PRODUÇÃO (V 1.0.0)
-- PostgreSQL / Neon DB
-- =========================================================

-- 1. EXTENSÕES E CONFIGURAÇÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Para IDs únicos se necessário
-- Se o Neon suportar PostGIS no futuro, usaríamos aqui. Por enquanto, matemática pura.

-- 2. FUNÇÃO DE TIMESTAMP AUTOMÁTICO
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =========================================================
-- [USER] TABELAS DE USUÁRIOS E PERFIL
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password TEXT NOT NULL,

    -- Gamification & Economia
    points BIGINT DEFAULT 0 CHECK (points >= 0),
    coins BIGINT DEFAULT 0 CHECK (coins >= 0),
    level INTEGER DEFAULT 1 CHECK (level > 0),
    xp_to_next_level BIGINT DEFAULT 1000,

    -- Metadados
    avatar_url TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =========================================================
-- [GAME] SISTEMA DE CAÇA E ITENS
-- =========================================================
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'collectible', -- collectible, consumable, badge
    rarity VARCHAR(50) DEFAULT 'common', -- common, rare, epic, legendary, mythic

    -- Geolocalização (Indexada)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    -- Valores do Item
    base_value_coins INTEGER DEFAULT 10,
    base_xp_reward INTEGER DEFAULT 50,
    image_url TEXT,

    -- Estado do Item
    active BOOLEAN DEFAULT TRUE,
    respawn_time_minutes INTEGER DEFAULT 60,
    last_captured_at TIMESTAMP,

    -- Propriedade (Para Marketplace P2P)
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_listed_for_sale BOOLEAN DEFAULT FALSE,
    listing_price INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca rápida no mapa (Geo-Spatial simulation)
CREATE INDEX idx_items_lat_lon ON items (latitude, longitude) WHERE active = true;
CREATE INDEX idx_items_owner ON items (owner_id);

-- =========================================================
-- [GAME] HISTÓRICO DE CAPTURAS
-- =========================================================
CREATE TABLE IF NOT EXISTS captures (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,

    -- Snapshot dos ganhos na hora da captura
    points_earned INTEGER NOT NULL,
    coins_earned INTEGER NOT NULL,

    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Localização exata onde o jogador estava (Anti-Cheat audit)
    player_lat DECIMAL(10, 8),
    player_lon DECIMAL(11, 8)
);

CREATE INDEX idx_captures_user ON captures (user_id);

-- =========================================================
-- [ECONOMY] TRANSAÇÕES E PEDIDOS
-- =========================================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    reference_id UUID DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id),

    -- Valores
    amount INTEGER NOT NULL, -- Negativo para débito, Positivo para crédito
    currency VARCHAR(10) DEFAULT 'KWZ', -- Moeda interna (Kwanza Coin)

    -- Contexto
    type VARCHAR(50) NOT NULL, -- capture_reward, market_buy, market_sell, store_purchase, p2p_transfer, service_payment
    description TEXT,
    related_item_id INTEGER, -- Opcional, se envolve um item

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions (user_id);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    category VARCHAR(50), -- voucher, merch, digital_good
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number UUID DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),

    amount_paid INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'completed', -- pending, processing, completed, refunded

    delivery_code VARCHAR(50), -- Código para resgatar voucher ou entrega
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- [SERVICES] TAXI & DELIVERY (UBER MODEL)
-- =========================================================
CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id),
    provider_id INTEGER REFERENCES users(id), -- Motorista/Entregador

    service_type VARCHAR(20) NOT NULL, -- 'taxi' ou 'delivery'
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, driver_arrived, in_progress, completed, cancelled

    -- Rota
    origin_lat DECIMAL(10, 8),
    origin_lon DECIMAL(11, 8),
    dest_lat DECIMAL(10, 8),
    dest_lon DECIMAL(11, 8),
    pickup_address TEXT,
    dropoff_address TEXT,

    -- Detalhes
    description TEXT,
    estimated_price INTEGER,
    final_price INTEGER,

    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_status ON service_requests (status) WHERE status = 'pending';

-- SEED DATA (DADOS INICIAIS DE TESTE)
INSERT INTO products (name, description, price, stock, category) VALUES
('Recarga Unitel 500UTT', 'Voucher digital enviado imediatamente.', 500, 1000, 'voucher'),
('Camiseta CaçaKwanza', 'Camiseta oficial do jogo.', 2000, 50, 'merch');