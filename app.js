var app = avalon.define({
    $id: "test",
    databases: []
})

function loadSamples() {
    app.databases = ENV.generateData().toArray();
    Monitoring.renderRate.ping();
    setTimeout(loadSamples, ENV.timeout);
}

loadSamples()