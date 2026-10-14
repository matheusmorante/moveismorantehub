-- Garante que transações abandonadas ou travadas por desconexão de cliente
-- liberem conexões e advisory locks após 60 segundos, prevenindo exaustão do pool do PostgREST.
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '60s';
