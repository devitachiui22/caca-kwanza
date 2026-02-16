class GamificationService {
    static calculateLevel(points) {
        // Fórmula simples: Nível = Raiz Quadrada dos pontos dividida por 10
        // Ex: 100 pontos = Nível 1. 1000 pontos = Nível 3.
        return Math.floor(Math.sqrt(points) / 10) + 1;
    }
}
module.exports = GamificationService;