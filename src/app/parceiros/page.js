'use client';

import React, { useMemo, useState } from 'react';
import './parceiros.css';

// Inbound surface for companies that want to sponsor MAPA FOME. No backend —
// submission composes a mailto: so the company's intent lands directly in the
// project's inbox. Keeps the /parceiros surface stateless and deployable as
// pure static output.

const RECIPIENT = 'contato@mapafome.com.br';

const TIERS = [
  {
    id: 'bairro',
    label: 'Apoiador Bairro',
    scope: 'Raio ~3 km em torno do seu estabelecimento',
    window: '1 mês',
    slots: '1 placement',
    ref: 'R$ 500',
    who: 'Pizzaria, restaurante local, farmácia de bairro, comércio de rua',
  },
  {
    id: 'cidade',
    label: 'Apoiador Cidade',
    scope: 'Cidade inteira (ex.: João Pessoa, Campina Grande)',
    window: '3 meses',
    slots: '2 placements',
    ref: 'R$ 2.500',
    who: 'Rede regional, supermercado local, cooperativa, franquia',
  },
  {
    id: 'estadual',
    label: 'Apoiador Estadual',
    scope: 'Paraíba inteira',
    window: '6 meses',
    slots: '3 placements',
    ref: 'R$ 10.000',
    who: 'Distribuidora estadual, universidade, fundação regional',
  },
  {
    id: 'nacional',
    label: 'Apoiador Nacional',
    scope: 'Brasil — todas as regiões atendidas',
    window: '12 meses',
    slots: 'Todos os placements',
    ref: 'R$ 30.000',
    who: 'Multinacional, fundação empresarial, banco',
  },
  {
    id: 'contrapartida',
    label: 'Contrapartida não-financeira',
    scope: 'Variável (produto ou serviço)',
    window: 'Variável',
    slots: 'Até 1 placement',
    ref: 'Produto / serviço equivalente',
    who: 'Cestas básicas, fretes, horas de agência, hospedagem',
  },
];

export default function ParceirosPage() {
  const [empresa, setEmpresa] = useState('');
  const [contato, setContato] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [tier, setTier] = useState('cidade');
  const [mensagem, setMensagem] = useState('');

  const mailtoHref = useMemo(() => {
    const subject = `Interesse em patrocínio — ${empresa || '[empresa]'} (${tier})`;
    const body = [
      'Olá, equipe MAPA FOME,',
      '',
      `Empresa: ${empresa}`,
      `Contato: ${contato} — ${cargo}`,
      `E-mail: ${email}`,
      `WhatsApp: ${whatsapp}`,
      `Tier de interesse: ${tier}`,
      '',
      'Mensagem:',
      mensagem,
      '',
      '—',
      'Enviado de mapafome.com.br/parceiros',
    ].join('\n');
    const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return `mailto:${RECIPIENT}?${q}`;
  }, [empresa, contato, cargo, email, whatsapp, tier, mensagem]);

  const canSubmit = empresa.trim() && email.trim();

  return (
    <main className="mdf-parc">
      <a href="/" className="mdf-parc__back">← Mapa</a>
      <h1>Seja parceiro do MAPA FOME</h1>
      <p className="mdf-parc__lead">
        O MAPA FOME é uma plataforma pública, gratuita e anônima que permite a
        qualquer cidadão, em três toques, mapear pessoas em situação de
        insegurança alimentar para que voluntários próximos levem ajuda em
        tempo real. Empresas parceiras sustentam a operação e ganham
        visibilidade honesta junto a comunidades ativas — sem vigiar ninguém.
      </p>

      <section className="mdf-parc__section">
        <h2>Como funciona o patrocínio</h2>
        <ol>
          <li>Você escolhe um <strong>tier</strong> (bairro, cidade, estadual ou nacional) e uma <strong>janela de tempo</strong>.</li>
          <li>Você envia o <strong>banner PNG</strong> (contrato de imagem 150 caracteres + checklist de dignidade).</li>
          <li>Configuramos a campanha com centro geográfico + raio + datas. Ela aparece apenas para pessoas dentro desse raio.</li>
          <li>Mensalmente você recebe acesso ao <a href="/relatorio-marketing">Relatório de marketing</a> com audiência potencial e engajada, em formato aberto.</li>
        </ol>
      </section>

      <section className="mdf-parc__section">
        <h2>Tiers de patrocínio</h2>
        <p className="mdf-parc__caption">Valores-referência negociáveis. A finalidade é sustentar a operação — parte da receita vira marketing digital que traz mais voluntários ativos.</p>
        <div className="mdf-parc__tiers">
          {TIERS.map((t) => (
            <article key={t.id} className={`mdf-parc__tier${tier === t.id ? ' mdf-parc__tier--selected' : ''}`}>
              <header>
                <h3>{t.label}</h3>
                <span className="mdf-parc__tier-ref">{t.ref}</span>
              </header>
              <dl>
                <dt>Território</dt><dd>{t.scope}</dd>
                <dt>Janela</dt><dd>{t.window}</dd>
                <dt>Slots</dt><dd>{t.slots}</dd>
                <dt>Típico</dt><dd>{t.who}</dd>
              </dl>
              <button
                type="button"
                onClick={() => setTier(t.id)}
                aria-pressed={tier === t.id}
              >
                {tier === t.id ? 'Selecionado' : 'Escolher este tier'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mdf-parc__section">
        <h2>Checklist de dignidade (inegociável)</h2>
        <ul>
          <li>Banner em português, sem motion loop, sem vermelho vivo que compita com o CTA de reporte.</li>
          <li>Marcas de aposta, empréstimo predatório, crédito consignado abusivo ou produtos com histórico público de violação trabalhista são recusados.</li>
          <li>Nenhum banner aparece sobre um ponto de pessoa mapeada. Slots só em superfícies institucionais (InfoPanel, /apoiar, /iniciativas, /parceiros).</li>
          <li>Nenhum tracking individual: não usamos pixel, device id, cookie de retargeting. O relatório conta pontos agregados no retângulo tempo × espaço contratado.</li>
          <li>Opt-in de co-marca: se houver divulgação conjunta, é aprovada por escrito pelo projeto antes de ir para o ar.</li>
        </ul>
      </section>

      <section className="mdf-parc__section mdf-parc__section--form">
        <h2>Manifestar interesse</h2>
        <p>Preencha o que souber. Enviando, seu cliente de e-mail abre com o conteúdo pronto para <code>{RECIPIENT}</code>.</p>
        <div className="mdf-parc__grid">
          <label><span>Empresa *</span>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={80} />
          </label>
          <label><span>Pessoa de contato</span>
            <input value={contato} onChange={(e) => setContato(e.target.value)} maxLength={80} placeholder="Nome" />
          </label>
          <label><span>Cargo</span>
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={80} placeholder="Ex: Gerente de ESG" />
          </label>
          <label><span>E-mail *</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
          </label>
          <label><span>WhatsApp</span>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={40} placeholder="(83) 9 9999-0000" />
          </label>
          <label><span>Tier</span>
            <select value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="mdf-parc__grid--wide"><span>Mensagem</span>
            <textarea
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={1000}
              placeholder="Conte em 2-3 frases por que a sua empresa quer apoiar, o território prioritário (cidade/bairro) e o prazo ideal."
            />
          </label>
        </div>

        <p className="mdf-parc__consent">
          Ao enviar, você concorda com os{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer">Termos de Privacidade</a>{' '}
          e os{' '}
          <a href="/terms.html" target="_blank" rel="noreferrer">Termos de Uso</a>.
          As informações preenchidas aqui vão apenas para o nosso e-mail de parcerias.
        </p>

        <a
          className={`mdf-parc__cta${canSubmit ? '' : ' mdf-parc__cta--disabled'}`}
          href={canSubmit ? mailtoHref : undefined}
          aria-disabled={!canSubmit}
        >
          Enviar interesse por e-mail
        </a>
        <p className="mdf-parc__fallback">
          Preferir contato direto? Escreva para{' '}
          <a href={`mailto:${RECIPIENT}`}>{RECIPIENT}</a>.
        </p>
      </section>

      <section className="mdf-parc__section">
        <h2>Perguntas frequentes</h2>
        <details>
          <summary>Posso contratar uma campanha só para um bairro?</summary>
          <p>Sim — o tier <strong>Apoiador Bairro</strong> aceita raio de 3 km em torno do seu estabelecimento. Você define o endereço e a duração.</p>
        </details>
        <details>
          <summary>Como vocês provam o alcance da minha campanha?</summary>
          <p>Em <a href="/relatorio-marketing">/relatorio-marketing</a>, aberta. Mostramos, por campanha, a audiência potencial (pontos de necessidade reportados no retângulo tempo × espaço contratado) e a engajada (desses, quantos foram atendidos por voluntário). Exportável em JSON e CSV.</p>
        </details>
        <details>
          <summary>Vocês rastreiam usuários para me vender dados?</summary>
          <p>Não. Nunca. O MAPA FOME não usa pixel, cookie de retargeting, nem device id. As métricas são agregadas por território e tempo. Empresas que procuram retargeting devem usar outro canal.</p>
        </details>
        <details>
          <summary>Podemos contribuir com produto em vez de dinheiro?</summary>
          <p>Sim — o tier <strong>Contrapartida não-financeira</strong> aceita cestas básicas, fretes, horas de agência, hospedagem em nuvem, entre outros. Precisa valorar no termo de parceria para registro contábil.</p>
        </details>
        <details>
          <summary>Meu banner pode ficar sobre um ponto do mapa?</summary>
          <p>Não. Nenhum banner aparece no mapa ou sobre a pessoa mapeada. Slots vivem em superfícies institucionais (rodapé do InfoPanel, /apoiar, /iniciativas, /parceiros).</p>
        </details>
      </section>
    </main>
  );
}
