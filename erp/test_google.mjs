const apiKey = "AIzaSyAdctX5wD5CFASKR4FwDXSMVtq3sAXXRE"; // Firebase Key from .env
async function test() {
    console.log("Testing Google Places API...");
    try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=joao%20batista%20stoco&key=${apiKey}`;
        const r = await fetch(url);
        const j = await r.json();
        console.log(JSON.stringify(j, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
