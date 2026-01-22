import './Home.css';
import TVC from '../../assets/tvc.mp4'

const Home = () => {
    return (
        <section className="homePage">
            <div className="homeContainer">
                <h1>Welcome to Michellin Sơn Tây</h1>
                <div className='homeContent'>
                <p>Michelin sơn tây là địa chỉ lốp uy tín ở sơn tây.</p> 
                <p>Là đại lý duy nhất. Chuyên cung cấp lốp dầu ắc quy chính hãng.</p>
                <p>Sửa chữa ôtô cứu hộ 24/7</p>
                <p>Sơn- Gò- Hàn.</p>
                <p>Chăm sóc làm đẹp xe từ A-Z.</p>
                </div>
            </div>
            <div className='videocontainer'>
                <video autoPlay muted loop >
                    <source src={TVC} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        </section>
    );
};

export default Home;