import './Partners.css';

const Partners = () => {
  const partners = [
    'Castrol',
    'TotalEnergies',
    'TECH',
    'Bendix',
    'LIQUI MOLY',
    'VARTA',
    'BOSCH',
    'brembo',
    'WURTH',
    'JS ASAKASHI',
    'MONROE',
    'Michelin'
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
                <span key={idx} className="scrollingItem">
                  {partner}
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
