// Whether this is a live server. Render sets RENDER on its servers, so one counts even without NODE_ENV.
const isProduction = () => process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

module.exports = { isProduction };
