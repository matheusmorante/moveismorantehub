const { buildCustomerSupportApi } = require('../erp/scripts/build-customer-support.cjs');

buildCustomerSupportApi().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
