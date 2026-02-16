class GeoService {
    /**
     * Calcula a distância em KM entre dois pontos (Latitude/Longitude)
     * Fórmula de Haversine
     */
    static getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

        const R = 6371; // Raio da Terra em km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distância em KM
    }

    static deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Calcula o preço estimado de uma corrida/entrega
     * Base: 200 Kz (Taxa Fixa) + 150 Kz por KM
     */
    static calculateRidePrice(distanceKm) {
        const BASE_FARE = 200;
        const PRICE_PER_KM = 150;
        const MIN_FARE = 500;

        let price = Math.ceil(BASE_FARE + (distanceKm * PRICE_PER_KM));
        return price < MIN_FARE ? MIN_FARE : price;
    }
}

module.exports = GeoService;