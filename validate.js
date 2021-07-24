const { ACMClient, DescribeCertificateCommand } = require("@aws-sdk/client-acm");
const Cloudflare = require('cloudflare');

const acm = new ACMClient();

const cloudflare = new Cloudflare({
  token: process.env.CLOUDFLARE_API_TOKEN,
});

module.exports.handler = async function (event) {
  const command = new DescribeCertificateCommand({
    CertificateArn: event.detail.responseElements.certificateArn,
  });

  const certificate = await acm.send(command);

  const { result: [zone] } = await cloudflare.zones.browse({
    name: certificate.Certificate.DomainName,
  });

  if (zone === undefined) {
    console.error('Zone', certificate.Certificate.DomainName, 'does not exist');
    return;
  }

  for (const validation of certificate.Certificate.DomainValidationOptions) {
    if (validation.ValidationMethod === 'DNS') {
      await cloudflare.dnsRecords.add(zone.id, {
        name: validation.ResourceRecord.Name,
        content: validation.ResourceRecord.Value,
        type: validation.ResourceRecord.Type,
      });
    }
  }
}
