class GeoService {
    // Calcula distância em KM entre dois pontos
    static getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da terra em km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    static deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
}

module.exports = GeoService;