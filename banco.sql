-- ============================================================
--  BIBLIOTECA CETEP — Script do Banco de Dados MySQL
--  Versão: 1.0  |  Charset: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS biblioteca_cetep
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biblioteca_cetep;

-- ============================================================
--  TABELA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome    VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categorias (nome) VALUES
  ('Tecnologia'),
  ('Ciências Exatas'),
  ('Literatura'),
  ('História'),
  ('Ciências Humanas'),
  ('Biologia'),
  ('Artes'),
  ('Outros');

-- ============================================================
--  TABELA: livros
-- ============================================================
CREATE TABLE IF NOT EXISTS livros (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(10)  NOT NULL UNIQUE,          -- ex: L001
  titulo       VARCHAR(200) NOT NULL,
  autor        VARCHAR(150) NOT NULL,
  categoria_id TINYINT UNSIGNED NOT NULL,
  status       ENUM('disponivel','emprestado','atrasado') NOT NULL DEFAULT 'disponivel',
  criado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_livro_categ FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_livro_status   ON livros(status);
CREATE INDEX idx_livro_titulo   ON livros(titulo);

-- ============================================================
--  TABELA: alunos
-- ============================================================
CREATE TABLE IF NOT EXISTS alunos (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo    VARCHAR(10)  NOT NULL UNIQUE,             -- ex: A001
  nome      VARCHAR(100) NOT NULL,
  turma     VARCHAR(10)  NOT NULL,
  ano       YEAR         NOT NULL,
  status    ENUM('ok','com_livro','atrasado') NOT NULL DEFAULT 'ok',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_aluno_turma  ON alunos(turma);
CREATE INDEX idx_aluno_status ON alunos(status);

-- ============================================================
--  TABELA: emprestimos
-- ============================================================
CREATE TABLE IF NOT EXISTS emprestimos (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  livro_id        INT UNSIGNED NOT NULL,
  aluno_id        INT UNSIGNED NOT NULL,
  data_retirada   DATE NOT NULL DEFAULT (CURRENT_DATE),
  data_devolucao  DATE NOT NULL,
  data_devolvido  DATE NULL,                          -- preenchido na devolução
  status          ENUM('aberto','vence_logo','atrasado','devolvido')
                  NOT NULL DEFAULT 'aberto',
  notificado      TINYINT(1) NOT NULL DEFAULT 0,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_livro FOREIGN KEY (livro_id)
    REFERENCES livros(id) ON UPDATE CASCADE,
  CONSTRAINT fk_emp_aluno FOREIGN KEY (aluno_id)
    REFERENCES alunos(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_emp_status    ON emprestimos(status);
CREATE INDEX idx_emp_livro     ON emprestimos(livro_id);
CREATE INDEX idx_emp_aluno     ON emprestimos(aluno_id);
CREATE INDEX idx_emp_devolucao ON emprestimos(data_devolucao);

-- ============================================================
--  VIEW: vw_emprestimos  (evita JOINs repetidos no backend)
-- ============================================================
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
  DATEDIFF(CURRENT_DATE, e.data_devolucao) AS dias_atraso
FROM emprestimos e
JOIN livros  l ON l.id = e.livro_id
JOIN alunos  a ON a.id = e.aluno_id;

-- ============================================================
--  VIEW: vw_atrasos
-- ============================================================
CREATE OR REPLACE VIEW vw_atrasos AS
SELECT *
FROM vw_emprestimos
WHERE status = 'atrasado';

-- ============================================================
--  PROCEDURE: atualizar_status_emprestimos
--  Recalcula status de todos os empréstimos abertos com base
--  na data atual. Chamar via evento agendado ou manualmente.
-- ============================================================
DELIMITER //
CREATE PROCEDURE atualizar_status_emprestimos()
BEGIN
  -- Marca como atrasado
  UPDATE emprestimos
  SET status = 'atrasado'
  WHERE status IN ('aberto', 'vence_logo')
    AND data_devolucao < CURRENT_DATE;

  -- Marca "vence_logo" (vence nos próximos 3 dias)
  UPDATE emprestimos
  SET status = 'vence_logo'
  WHERE status = 'aberto'
    AND data_devolucao BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY);

  -- Atualiza status dos livros
  UPDATE livros l
  SET l.status = 'atrasado'
  WHERE l.id IN (
    SELECT livro_id FROM emprestimos WHERE status = 'atrasado'
  );

  -- Atualiza status dos alunos
  UPDATE alunos a
  SET a.status = 'atrasado'
  WHERE a.id IN (
    SELECT aluno_id FROM emprestimos WHERE status = 'atrasado'
  );

  UPDATE alunos a
  SET a.status = 'com_livro'
  WHERE a.status = 'ok'
    AND a.id IN (
      SELECT aluno_id FROM emprestimos WHERE status IN ('aberto','vence_logo')
    );
END //
DELIMITER ;

-- ============================================================
--  EVENTO: atualizar status todo dia à meia-noite
--  (requer event_scheduler=ON no my.cnf)
-- ============================================================
CREATE EVENT IF NOT EXISTS evt_status_diario
  ON SCHEDULE EVERY 1 DAY
  STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
  DO CALL atualizar_status_emprestimos();

-- ============================================================
--  USUÁRIO DE APLICAÇÃO (princípio do menor privilégio)
--  Troque 'SenhaForte#2026' por algo seguro de verdade!
-- ============================================================
CREATE USER IF NOT EXISTS 'biblioteca_app'@'localhost'
  IDENTIFIED BY 'root';

GRANT SELECT, INSERT, UPDATE ON biblioteca_cetep.livros       TO 'biblioteca_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON biblioteca_cetep.alunos       TO 'biblioteca_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON biblioteca_cetep.emprestimos  TO 'biblioteca_app'@'localhost';
GRANT SELECT                 ON biblioteca_cetep.categorias   TO 'biblioteca_app'@'localhost';
GRANT SELECT                 ON biblioteca_cetep.vw_emprestimos TO 'biblioteca_app'@'localhost';
GRANT SELECT                 ON biblioteca_cetep.vw_atrasos     TO 'biblioteca_app'@'localhost';
GRANT EXECUTE                ON biblioteca_cetep.*              TO 'biblioteca_app'@'localhost';

FLUSH PRIVILEGES;

-- ============================================================
--  DADOS DE EXEMPLO (remova em produção)
-- ============================================================
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
