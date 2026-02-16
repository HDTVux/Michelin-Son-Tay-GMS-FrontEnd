import './Partners.css';
import castrol from '../../../assets/totalenergies.png';
import totalenergies from '../../../assets/totalenergies.png';
import tech from '../../../assets/tech.png';
import bendix from '../../../assets/bendix.png';
import liquimoly from '../../../assets/liqui moly.png';
import varta from '../../../assets/varta.png';
import bosch from '../../../assets/bosch.png';
import brembo from '../../../assets/brembo.png';
import wurth from '../../../assets/wurth.png';
import jsasakashi from '../../../assets/js asakashi.png';
import monroe from '../../../assets/monroe.png';
import hunter from '../../../assets/hunter.png';
import bfgoodrich from '../../../assets/bfgoodrich.png';

const Partners = () => {
  const partners = [
    { name: 'TotalEnergies', image: totalenergies, style: 'totalenergies' },
    { name: 'TECH', image: tech, style: 'tech' },
    { name: 'Bendix', image: bendix, style: 'bendix' },
    { name: 'LIQUI MOLY', image: liquimoly, style: 'liquimoly' },
    { name: 'VARTA', image: varta, style: 'varta' },
    { name: 'BOSCH', image: bosch, style: 'bosch' },
    { name: 'brembo', image: brembo, style: 'brembo' },
    { name: 'WURTH', image: wurth, style: 'wurth' },
    { name: 'JS ASAKASHI', image: jsasakashi, style: 'jsasakashi' },
    { name: 'MONROE', image: monroe, style: 'monroe' },
    { name: 'Hunter', image: hunter, style: 'hunter' },
    { name: 'BFGoodrich', image: bfgoodrich, style: 'bfgoodrich' }
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
                    <img src={partner.image} alt={partner.name} className="partnerImage" />
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
