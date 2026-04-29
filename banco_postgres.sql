-- ============================================================
--  BIBLIOTECA CETEP — Script PostgreSQL (Supabase)
--  Execute no Supabase: Dashboard → SQL Editor → cole e rode
-- ============================================================

-- TABELA: categorias
CREATE TABLE IF NOT EXISTS categorias (
  id    SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome  VARCHAR(60) NOT NULL UNIQUE
);

INSERT INTO categorias (nome) VALUES
  ('Tecnologia'), ('Ciências Exatas'), ('Literatura'),
  ('História'), ('Ciências Humanas'), ('Biologia'),
  ('Artes'), ('Outros')
ON CONFLICT (nome) DO NOTHING;

-- TABELA: livros
CREATE TABLE IF NOT EXISTS livros (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo       VARCHAR(10)  NOT NULL UNIQUE,
  titulo       VARCHAR(200) NOT NULL,
  autor        VARCHAR(150) NOT NULL,
  categoria_id SMALLINT     NOT NULL,
  status       TEXT NOT NULL DEFAULT 'disponivel'
                 CHECK (status IN ('disponivel','emprestado','atrasado')),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_livro_categ FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_livro_status ON livros(status);
CREATE INDEX IF NOT EXISTS idx_livro_titulo ON livros(titulo);

-- TABELA: alunos
CREATE TABLE IF NOT EXISTS alunos (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo    VARCHAR(10)  NOT NULL UNIQUE,
  nome      VARCHAR(100) NOT NULL,
  turma     VARCHAR(10)  NOT NULL,
  ano       SMALLINT     NOT NULL,
  status    TEXT NOT NULL DEFAULT 'ok'
              CHECK (status IN ('ok','com_livro','atrasado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aluno_turma  ON alunos(turma);
CREATE INDEX IF NOT EXISTS idx_aluno_status ON alunos(status);

-- TABELA: emprestimos
CREATE TABLE IF NOT EXISTS emprestimos (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  livro_id        INTEGER NOT NULL,
  aluno_id        INTEGER NOT NULL,
  data_retirada   DATE    NOT NULL DEFAULT CURRENT_DATE,
  data_devolucao  DATE    NOT NULL,
  data_devolvido  DATE,
  status          TEXT NOT NULL DEFAULT 'aberto'
                    CHECK (status IN ('aberto','vence_logo','atrasado','devolvido')),
  notificado      BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_emp_livro FOREIGN KEY (livro_id) REFERENCES livros(id) ON UPDATE CASCADE,
  CONSTRAINT fk_emp_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emp_status    ON emprestimos(status);
CREATE INDEX IF NOT EXISTS idx_emp_livro     ON emprestimos(livro_id);
CREATE INDEX IF NOT EXISTS idx_emp_aluno     ON emprestimos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_emp_devolucao ON emprestimos(data_devolucao);

-- VIEW: vw_emprestimos
CREATE OR REPLACE VIEW vw_emprestimos AS
SELECT
  e.id,
  e.livro_id,
  l.codigo        AS livro_codigo,
  l.titulo        AS livro,
  e.aluno_id,
  a.codigo        AS aluno_codigo,
  a.nome          AS aluno,
  a.turma,
  e.data_retirada,
  e.data_devolucao,
  e.data_devolvido,
  e.status,
  e.notificado,
  (CURRENT_DATE - e.data_devolucao) AS dias_atraso
FROM emprestimos e
JOIN livros  l ON l.id = e.livro_id
JOIN alunos  a ON a.id = e.aluno_id;

-- VIEW: vw_atrasos
CREATE OR REPLACE VIEW vw_atrasos AS
SELECT * FROM vw_emprestimos WHERE status = 'atrasado';

-- FUNÇÃO: atualizar_status_emprestimos
-- Equivalente ao PROCEDURE/EVENT do MySQL.
-- Para rodar automaticamente todo dia no Supabase:
--   1. Database → Extensions → ative pg_cron
--   2. Execute: SELECT cron.schedule('status-diario', '0 0 * * *', 'SELECT atualizar_status_emprestimos()');
CREATE OR REPLACE FUNCTION atualizar_status_emprestimos()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE emprestimos
  SET status = 'atrasado'
  WHERE status IN ('aberto', 'vence_logo')
    AND data_devolucao < CURRENT_DATE;

  UPDATE emprestimos
  SET status = 'vence_logo'
  WHERE status = 'aberto'
    AND data_devolucao BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days');

  UPDATE livros SET status = 'atrasado'
  WHERE id IN (SELECT livro_id FROM emprestimos WHERE status = 'atrasado');

  UPDATE alunos SET status = 'atrasado'
  WHERE id IN (SELECT aluno_id FROM emprestimos WHERE status = 'atrasado');

  UPDATE alunos SET status = 'com_livro'
  WHERE status = 'ok'
    AND id IN (SELECT aluno_id FROM emprestimos WHERE status IN ('aberto','vence_logo'));
END;
$$;

-- DADOS DE EXEMPLO (remova em produção)
INSERT INTO livros (codigo, titulo, autor, categoria_id, status) VALUES
  ('L001', 'Java Básico',            'Herbert Schildt',  1, 'emprestado'),
  ('L002', 'Matemática Avançada',    'James Stewart',    2, 'atrasado'),
  ('L003', 'Dom Casmurro',           'Machado de Assis', 3, 'disponivel'),
  ('L004', 'O Cortiço',              'Aluísio Azevedo',  3, 'emprestado'),
  ('L005', 'Física Quântica',        'Richard Feynman',  2, 'atrasado'),
  ('L006', 'Química Orgânica',       'Paula Yurkanis',   2, 'emprestado'),
  ('L007', 'Programação Python',     'Mark Lutz',        1, 'disponivel'),
  ('L008', 'A Revolução dos Bichos', 'George Orwell',    3, 'disponivel');

INSERT INTO alunos (codigo, nome, turma, ano, status) VALUES
  ('A001', 'Ana Souza',       '3ºA', 2026, 'atrasado'),
  ('A002', 'Carlos Mendes',   '2ºB', 2026, 'atrasado'),
  ('A003', 'Pedro Lima',      '1ºC', 2026, 'com_livro'),
  ('A004', 'Juliana Reis',    '3ºB', 2026, 'com_livro'),
  ('A005', 'Lucas Ferreira',  '2ºA', 2026, 'com_livro'),
  ('A006', 'Maria Oliveira',  '1ºA', 2026, 'ok'),
  ('A007', 'Rafael Torres',   '3ºC', 2026, 'atrasado'),
  ('A008', 'Bruna Costa',     '2ºC', 2026, 'atrasado');

INSERT INTO emprestimos (livro_id, aluno_id, data_retirada, data_devolucao, status) VALUES
  (1, 3, '2026-04-01', '2026-04-17', 'aberto'),
  (2, 2, '2026-04-01', '2026-04-11', 'atrasado'),
  (4, 4, '2026-04-05', '2026-04-25', 'aberto'),
  (5, 1, '2026-04-03', '2026-04-13', 'atrasado'),
  (6, 5, '2026-04-08', '2026-04-28', 'aberto');
