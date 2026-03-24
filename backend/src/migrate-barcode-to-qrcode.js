const { Sequelize, DataTypes } = require('sequelize')

// Connexion directe (adaptez les paramètres à votre configuration)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '../dev.sqlite',   // ⚠️ remplacez par le bon chemin
  logging: false
})

async function migrate() {
  const queryInterface = sequelize.getQueryInterface()

  try {
    // 1. Vérifier la structure actuelle
    const bagInfo = await queryInterface.describeTable('bags')

    // Si déjà migré (qrcode existe et barcode n'existe pas)
    if (bagInfo.qrcode && !bagInfo.barcode) {
      console.log('✅ Table déjà migrée (qrcode présent, barcode absent)')
      // Ajouter qrcode_url si manquant
      if (!bagInfo.qrcode_url) {
        console.log('🔧 Ajout de qrcode_url...')
        await queryInterface.addColumn('bags', 'qrcode_url', {
          type: DataTypes.STRING(255),
          allowNull: true
        })
        console.log('✅ qrcode_url ajouté')
      } else {
        console.log('✅ qrcode_url déjà présent')
      }
      process.exit(0)
      return
    }

    // 2. Migration nécessaire : barcode → qrcode
    console.log('🔧 Migration : barcode → qrcode...')

    // Désactiver temporairement les clés étrangères (SQLite)
    await sequelize.query('PRAGMA foreign_keys = OFF;')

    // Renommer la colonne barcode en qrcode
    await queryInterface.renameColumn('bags', 'barcode', 'qrcode')
    console.log('  ✓ Colonne renommée')

    // Ajouter la colonne qrcode_url
    await queryInterface.addColumn('bags', 'qrcode_url', {
      type: DataTypes.STRING(255),
      allowNull: true
    })
    console.log('  ✓ Colonne qrcode_url ajoutée')

    // Réactiver les clés étrangères
    await sequelize.query('PRAGMA foreign_keys = ON;')

    console.log('🎉 Migration terminée avec succès !')
    process.exit(0)

  } catch (err) {
    // Réactiver les clés étrangères même en cas d'erreur
    await sequelize.query('PRAGMA foreign_keys = ON;').catch(() => {})
    console.error('❌ Erreur lors de la migration :', err.message)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

migrate()