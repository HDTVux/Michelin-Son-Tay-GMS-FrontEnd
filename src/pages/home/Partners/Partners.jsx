import './Partners.css';
import logo1 from '../../../assets/OIP (1).jpg';
import logo2 from '../../../assets/OIP (2).jpg';
import logo3 from '../../../assets/OIP (3).jpg';
import logo4 from '../../../assets/OIP (4).jpg';
import logo5 from '../../../assets/OIP (5).jpg';
import logo6 from '../../../assets/OIP (6).jpg';
import logo7 from '../../../assets/OIP (7).jpg';
import logo8 from '../../../assets/OIP (8).jpg';
import logo9 from '../../../assets/OIP (9).jpg';
import logo10 from '../../../assets/OIP.jpg';
import logo11 from '../../../assets/z7521319305220_601a4d33b4a5662062e9614aa388c1ee.jpg';

const Partners = () => {
  const partners = [
    { name: 'Partner 1', image: logo1, style: 'partner1' },
    { name: 'Partner 2', image: logo2, style: 'partner2' },
    { name: 'Partner 3', image: logo3, style: 'partner3' },
    { name: 'Partner 4', image: logo4, style: 'partner4' },
    { name: 'Partner 5', image: logo5, style: 'partner5' },
    { name: 'Partner 6', image: logo6, style: 'partner6' },
    { name: 'Partner 7', image: logo7, style: 'partner7' },
    { name: 'Partner 8', image: logo8, style: 'partner8' },
    { name: 'Partner 9', image: logo9, style: 'partner9' },
    { name: 'Partner 10', image: logo10, style: 'partner10' },
    { name: 'Partner 11', image: logo11, style: 'partner11' }
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
