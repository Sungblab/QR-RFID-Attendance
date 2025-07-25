const sequelize = require('./config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test basic table creation
    const { QueryTypes } = require('sequelize');
    
    // Try to create a simple test table
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS test_table (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100)
        );
      `, { type: QueryTypes.RAW });
      console.log('✅ Test table creation successful');
      
      // Clean up
      await sequelize.query('DROP TABLE IF EXISTS test_table;', { type: QueryTypes.RAW });
      console.log('✅ Test table cleanup successful');
      
    } catch (tableError) {
      console.error('❌ Table creation error:', tableError.message);
      console.error('Full error:', tableError);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();