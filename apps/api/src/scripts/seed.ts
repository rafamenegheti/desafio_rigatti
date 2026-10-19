import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { Company } from '../modules/companies/company.model';
import { Product } from '../modules/products/product.model';
import { User } from '../modules/users/user.model';

const PASSWORD = 'Senha@123';
// Placeholder com o nome do produto (fotos aleatórias não combinariam com o item)
const img = (name: string) => `https://placehold.co/640x420/e0e7ff/4338ca/png?text=${encodeURIComponent(name)}`;

interface SeedProduct {
  name: string;
  description: string;
  price: number;
  category: string;
}

const companies: { name: string; adminEmail: string; userEmail: string; products: SeedProduct[] }[] = [
  {
    name: 'TechStore',
    adminEmail: 'admin@techstore.com',
    userEmail: 'cliente@techstore.com',
    products: [
      { name: 'Notebook Pro 14"', description: 'Processador de 8 núcleos, 16 GB de RAM, SSD de 512 GB e tela Full HD. Ideal para trabalho e estudos.', price: 5499.9, category: 'Notebooks' },
      { name: 'Notebook Gamer X15', description: 'Placa de vídeo dedicada, 32 GB de RAM, SSD de 1 TB e tela de 144 Hz.', price: 8999, category: 'Notebooks' },
      { name: 'Notebook Essencial 15"', description: 'Notebook de entrada para tarefas do dia a dia, 8 GB de RAM e SSD de 256 GB.', price: 2799, category: 'Notebooks' },
      { name: 'Smartphone Nova 128 GB', description: 'Tela AMOLED de 6,5", câmera tripla de 50 MP e bateria de 5000 mAh.', price: 2199.9, category: 'Celulares' },
      { name: 'Smartphone Nova Max 256 GB', description: 'Versão topo de linha com câmera de 108 MP, carregamento rápido de 65 W e tela de 120 Hz.', price: 3999, category: 'Celulares' },
      { name: 'Fone de Ouvido Bluetooth ANC', description: 'Cancelamento ativo de ruído, 30 horas de bateria e microfone com redução de eco.', price: 499.9, category: 'Áudio' },
      { name: 'Fone com Fio Studio', description: 'Fone profissional fechado para monitoração, cabo destacável de 3 m.', price: 349, category: 'Áudio' },
      { name: 'Caixa de Som Portátil', description: 'À prova d\'água (IP67), 20 horas de bateria e som estéreo potente.', price: 279.9, category: 'Áudio' },
      { name: 'Monitor 27" 4K', description: 'Painel IPS 4K de 27 polegadas, 99% sRGB, entrada USB-C com carregamento de 65 W.', price: 2399, category: 'Monitores' },
      { name: 'Monitor Gamer 24" 165 Hz', description: 'Tela de 24" Full HD, 165 Hz, tempo de resposta de 1 ms e suporte ajustável.', price: 1199.9, category: 'Monitores' },
      { name: 'Teclado Mecânico Sem Fio', description: 'Switches silenciosos, layout ABNT2, iluminação RGB e bateria de 3 meses.', price: 429.9, category: 'Periféricos' },
      { name: 'Mouse Ergonômico Sem Fio', description: 'Sensor de 4000 DPI, 6 botões programáveis e conexão Bluetooth ou receptor USB.', price: 189.9, category: 'Periféricos' },
      { name: 'Webcam Full HD 1080p', description: 'Microfone duplo com redução de ruído, foco automático e tampa de privacidade.', price: 259.9, category: 'Periféricos' },
    ],
  },
  {
    name: 'Casa & Conforto',
    adminEmail: 'admin@casaconforto.com',
    userEmail: 'cliente@casaconforto.com',
    products: [
      { name: 'Sofá Retrátil 3 Lugares', description: 'Sofá retrátil e reclinável em tecido suede, estrutura em madeira de reflorestamento.', price: 2899, category: 'Sala' },
      { name: 'Mesa de Centro Redonda', description: 'Tampo de vidro temperado e base em metal preto, 80 cm de diâmetro.', price: 649.9, category: 'Sala' },
      { name: 'Rack para TV até 65"', description: 'Rack com nichos e portas de correr, acabamento amadeirado.', price: 899, category: 'Sala' },
      { name: 'Cadeira de Escritório Ergonômica', description: 'Apoio lombar ajustável, braços 3D, encosto em tela respirável e base giratória.', price: 1099.9, category: 'Escritório' },
      { name: 'Mesa de Escritório 140 cm', description: 'Mesa em MDF com passagem de fios e pés de aço, ideal para home office.', price: 549.9, category: 'Escritório' },
      { name: 'Luminária de Mesa LED', description: 'Três temperaturas de cor, intensidade regulável e porta USB para carregar o celular.', price: 119.9, category: 'Escritório' },
      { name: 'Cama Box Queen', description: 'Colchão de molas ensacadas com pillow top e base box em courino.', price: 2499, category: 'Quarto' },
      { name: 'Jogo de Cama 400 Fios', description: 'Lençol com elástico, fronhas e capa de edredom em algodão egípcio, tamanho queen.', price: 399.9, category: 'Quarto' },
      { name: 'Guarda-Roupa 6 Portas', description: 'Com espelho, gavetas internas e cabideiro, em MDF de alta resistência.', price: 1799, category: 'Quarto' },
      { name: 'Jogo de Panelas Antiaderente 5 Peças', description: 'Revestimento cerâmico, cabo ergonômico e compatível com fogão por indução.', price: 459.9, category: 'Cozinha' },
      { name: 'Air Fryer 5 Litros', description: 'Fritadeira sem óleo com timer digital, 8 programas e cesto antiaderente.', price: 429, category: 'Cozinha' },
      { name: 'Aparelho de Jantar 20 Peças', description: 'Porcelana branca, vai ao micro-ondas e à lava-louças, serve 6 pessoas.', price: 349.9, category: 'Cozinha' },
    ],
  },
];

async function seed() {
  if (env.NODE_ENV === 'production') {
    throw new Error('O seed apaga todos os dados e não roda com NODE_ENV=production');
  }
  await connectDatabase(env.MONGODB_URI);

  // Apagar tudo cruza empresas de propósito, por isso o skipTenantGuard explícito
  const all = { skipTenantGuard: true };
  await Promise.all([Product.deleteMany({}, all), User.deleteMany({}, all), Company.deleteMany({})]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const c of companies) {
    const company = await Company.create({ name: c.name });
    await User.create([
      { company_id: company._id, name: `Admin ${c.name}`, email: c.adminEmail, passwordHash, role: 'admin' },
      { company_id: company._id, name: `Cliente ${c.name}`, email: c.userEmail, passwordHash, role: 'user' },
    ]);
    await Product.insertMany(
      c.products.map((p) => ({ ...p, imageUrl: img(p.name), company_id: company._id })),
    );
    console.log(`✔ ${c.name}: ${c.products.length} produtos`);
  }

  console.log('\nUsuários de teste (senha de todos: ' + PASSWORD + '):');
  for (const c of companies) {
    console.log(`  ${c.name}`);
    console.log(`    admin: ${c.adminEmail}`);
    console.log(`    user:  ${c.userEmail}`);
  }
}

seed()
  .catch((err) => {
    console.error('Falha no seed:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
