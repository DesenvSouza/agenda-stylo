using QRCoder;

namespace AgendaEstilo.Infrastructure.Services;

public class QrCodeService
{
    public byte[] GeneratePng(string content)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        return qrCode.GetGraphic(10);
    }
}
