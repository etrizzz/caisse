export const WizzaEngine = {
  buildMotivation(totalCents) {
    if (totalCents >= 30000) {
      return 'Ticket légendaire en vue : cadence stable, sourire premium et upsell collector conseillé.';
    }

    if (totalCents >= 12000) {
      return 'Très beau panier : Wizza suggère de proposer une protection vitrine ou un Blu-ray collector.';
    }

    return 'Encaissement fluide. Wizza reste en veille pour la prochaine opportunité.';
  },

  buildStockAlert(catalog) {
    return catalog
      .filter((item) => /Disney|Marvel|Pixar|Star Wars|Lucasfilm/.test(item.franchise) && item.stock <= item.safety_stock)
      .map((item) => `Stock bas sur ${item.name} (${item.stock} restant${item.stock > 1 ? 's' : ''}).`);
  },

  buildClosingSummary({ totalReceipts = 0, revenueCents = 0 }) {
    const revenue = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(revenueCents / 100);

    return `Clôture douce et sécurisée : ${totalReceipts} tickets, ${revenue} encaissés, sauvegarde locale validée.`;
  }
};
