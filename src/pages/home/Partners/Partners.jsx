import './Partners.css';

const Partners = () => {
  const partners = [
    { name: 'Castrol', icon: '🛢️', style: 'castrol' },
    { name: 'TotalEnergies', icon: '⚡', style: 'totalenergies' },
    { name: 'TECH', icon: '🔧', style: 'tech' },
    { name: 'Bendix', icon: '🛑', style: 'bendix' },
    { name: 'LIQUI MOLY', icon: '💧', style: 'liquimoly' },
    { name: 'VARTA', icon: '🔋', style: 'varta' },
    { name: 'BOSCH', icon: '⚙️', style: 'bosch' },
    { name: 'brembo', icon: '🛞', style: 'brembo' },
    { name: 'WURTH', icon: '🔩', style: 'wurth' },
    { name: 'JS ASAKASHI', icon: '🏭', style: 'jsasakashi' },
    { name: 'MONROE', icon: '🚗', style: 'monroe' }
  ];

  return (
    <section className="partnersSection">
      <div className="partnersContainer">
        <div className="partnersHeader">
          <h2 className="partnersTitle">Đối tác & Hãng hợp tác</h2>
          <p className="partnersSubtitle">Chúng tôi hợp tác với các thương hiệu hàng đầu trong ngành</p>
        </div>

        {/* Scrolling Text Banner */}
        <div className="partnersBanner">
          <div className="scrollingText">
            <div className="scrollingContent">
              {[...partners, ...partners].map((partner, idx) => (
                <span key={idx} className={`scrollingItem ${partner.style}`}>
                  <div className="partnerWrapper">
                    <span className="partnerIcon">{partner.icon}</span>
                    {partner.style === 'jsasakashi' ? (
                      <span className="partnerName">
                        <span className="jsLarge">JS</span>
                        <span className="asakashiSmall">ASAKASHI</span>
                      </span>
                    ) : (
                      <span className="partnerName">{partner.name}</span>
                    )}
                  </div>
                  <span className="starSeparator">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partners;
