// Lista de apoiadores do MAPA FOME. Para adicionar mais, basta incluir um
// objeto { nome, instagram } no array — o link do Instagram é montado a partir
// do handle (sem o @).
const APOIADORES = [
    { nome: 'Ediel Costa', instagram: 'edielcosta', role: 'influenciador digital' },
    { nome: 'Você ajudando como pode o ', instagram: 'mapafome' },
];

const Apoiadores = () => {
    return (
        <>
            <br/>
            Apoiadores que ajudam a tornar o MAPA FOME possível:
            {APOIADORES.map((a) => (
                <span key={a.instagram}>
                    <br/>
                    <span style={{ fontSize: '1.4em', color: 'green' }}>•</span>
                    {a.nome}{' '}
                    <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.instagram.com/${a.instagram}/`}
                    >
                        @{a.instagram}
                    </a> - {a.role}

                </span>
            ))}
        </>
    );
};
export default Apoiadores;
