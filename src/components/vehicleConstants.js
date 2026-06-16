export const VEHICLE_MAKES = [
    'AC', 'ACURA', 'ALFA ROMEO', 'ASTON MARTIN', 'AUDI', 'AUSTIN', 'BAIC', 'BENTLEY', 'BMW', 'BRABUS', 'BUGATTI', 
    'BUICK', 'BYD', 'CHANGAN', 'CHERY', 'CHEVROLET', 'CHRYSLER', 'CITROEN', 'DAIHATSU', 'DALLARA', 'DATSUN', 
    'DEEPAL', 'DFM', 'DFSK', 'ELIO', 'FERRARI', 'FIAT', 'FORD', 'GEELY', 'GENESIS', 'GORDON MURRAY', 'GREAT WALL', 
    'GUMPERT', 'HAFEI', 'HAIMA', 'HAVAL', 'HOMMEL', 'HONDA', 'HUMMER', 'HYUNDAI', 'INEOS', 'INFINITI', 'ISUZU', 
    'IVECO', 'JAC', 'JAGUAR', 'JEEP', 'JMC', 'KGM', 'KIA', 'KOENIGSEGG', 'KTM', 'LADA', 'LAMBORGHINI', 'LAND ROVER', 
    'LEXUS', 'LIFAN', 'LINCOLN', 'LUCID', 'LUXGEN', 'MAHINDRA', 'MARUSSIA', 'MASERATI', 'MAYBACH', 'MAZDA', 
    'MCLAREN', 'MERCEDES-AMG', 'MERCEDES-BENZ', 'MG', 'MG ROVER', 'MIA ELECTRIC', 'MINI', 'MITSUBISHI', 
    'MITSUBISHI FUSO', 'NISSAN', 'OMODA', 'PAGANI', 'PANOZ', 'PERODUA', 'PEUGEOT', 'POLESTAR', 'PORSCHE', 
    'PRAGA', 'PROTON', 'RENAULT', 'RIDDARA', 'RIVIAN', 'ROLLS ROYCE', 'SANTANA', 'SSANGYONG', 'SSC', 'SUBARU', 
    'SUZUKI', 'TATA', 'TESLA', 'TOGG', 'TOYOTA', 'TRABANT', 'UAZ', 'VINFAST', 'VOLKSWAGEN', 'VOLVO', 'XIAOMI', 
    'XPENG', 'ZEEKR', 'ZENVO', 'ZOTYE', 'ZX AUTO'
];

export const POPULAR_MODELS = {
    'TOYOTA': ['Camry', 'Corolla Altis', 'Vios', 'Fortuner', 'Innova', 'Raize', 'Yaris', 'Veloz Cross', 'Corolla Cross', 'Hilux', 'Land Cruiser', 'Wigo'],
    'HONDA': ['Civic', 'City', 'CR-V', 'HR-V', 'Accord', 'Brio', 'BR-V'],
    'HYUNDAI': ['Accent', 'Grand i10', 'Santa Fe', 'Tucson', 'Elantra', 'Creta', 'Stargazer', 'Custin', 'Palisade'],
    'VINFAST': ['VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'Fadil', 'Lux A2.0', 'Lux SA2.0', 'President'],
    'MAZDA': ['Mazda 2', 'Mazda 3', 'Mazda 6', 'CX-5', 'CX-8', 'CX-3', 'CX-30', 'BT-50'],
    'KIA': ['Morning', 'Soluto', 'K3', 'K5', 'Sonet', 'Seltos', 'Sportage', 'Sorento', 'Carnival', 'Carens'],
    'FORD': ['Ranger', 'Everest', 'Explorer', 'Territory', 'Transit', 'EcoSport', 'Focus'],
    'MITSUBISHI': ['Xpander', 'Outlander', 'Attrage', 'Pajero Sport', 'Triton'],
    'MERCEDES-BENZ': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLA', 'GLB', 'GLE', 'GLS', 'Maybach'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'X7'],
    'AUDI': ['A4', 'A6', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron'],
    'LEXUS': ['ES', 'LS', 'NX', 'RX', 'GX', 'LX'],
    'NISSAN': ['Almera', 'Navara', 'Kicks', 'Terra', 'Sunny'],
    'SUZUKI': ['Swift', 'Ertiga', 'XL7', 'Ciaz', 'Carry'],
    'CHEVROLET': ['Cruze', 'Colorado', 'Captiva', 'Spark', 'Trailblazer'],
    'PEUGEOT': ['2008', '3008', '5008', 'Traveller'],
    'VOLVO': ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60'],
    'SUBARU': ['Forester', 'Outback', 'WRX', 'BRZ'],
    'PORSCHE': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster'],
    'BYD': ['Atto 3', 'Dolphin', 'Seal'],
    'MG': ['MG5', 'ZS', 'HS', 'Cyberster'],
};

export const yearsList = (() => {
    const list = [];
    for (let y = 2026; y >= 1990; y--) {
        list.push(y);
    }
    return list;
})();
