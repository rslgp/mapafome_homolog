import Link from 'next/link';

// UX-M27: a useful 404 — a broken link shared in a WhatsApp group must not be
// a dead end. Server component, zero client JS: plain links back into the
// product. pt-BR copy (the product's error surfaces are pt-first); smoke200
// keeps excluding /_not-found as an intentional error shell.
export default function NotFound() {
  return (
    <main style={{ maxWidth: '32rem', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
      <h1>Página não encontrada</h1>
      <p>
        O endereço pode ter mudado, mas o mapa continua no ar. Por onde quer
        seguir?
      </p>
      <ul style={{ listStyle: 'none', padding: 0, lineHeight: 2.4 }}>
        <li><Link href="/">Ver o mapa da fome</Link></li>
        <li><Link href="/pets">MapaPet — pets perdidos e achados</Link></li>
        <li><Link href="/assinar">Apoiar o MAPA FOME</Link></li>
      </ul>
    </main>
  );
}
