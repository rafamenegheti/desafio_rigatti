// Roda antes de cada arquivo de teste, antes de qualquer import do app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
process.env.LLM_PROVIDER = 'mock';
process.env.UPLOAD_DIR = 'uploads-test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/mini_saas_test';
