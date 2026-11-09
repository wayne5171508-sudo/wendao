// 產生測試站圖示：在正式圖示右上角加紅色「測」角標（maskable 圖示放在安全區內）
// 用法：swift staging/make-icons.swift   （在 問道青冥-網頁版/ 目錄執行；正式圖示換了再跑一次）
import AppKit

let names = ["apple-touch-icon", "icon-192", "icon-512", "icon-maskable-512"]
for n in names {
    guard let src = NSImage(contentsOfFile: "icons/\(n).png"), let rep = src.representations.first else { fatalError("讀不到 icons/\(n).png") }
    let W = CGFloat(rep.pixelsWide), H = CGFloat(rep.pixelsHigh)
    let out = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W), pixelsHigh: Int(H), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: out)
    src.draw(in: NSRect(x: 0, y: 0, width: W, height: H))
    let maskable = n.contains("maskable")
    let r = W * (maskable ? 0.16 : 0.21)
    // AppKit 原點在左下：右上角
    let cx = maskable ? W * 0.66 : W - r - W * 0.03, cy = maskable ? H * 0.66 : H - r - W * 0.03
    NSColor(red: 0.86, green: 0.12, blue: 0.16, alpha: 1).setFill()
    NSBezierPath(ovalIn: NSRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)).fill()
    NSColor.white.setStroke(); let ring = NSBezierPath(ovalIn: NSRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)); ring.lineWidth = max(1, r * 0.08); ring.stroke()
    let font = NSFont.boldSystemFont(ofSize: r * 1.15)
    let s = NSAttributedString(string: "測", attributes: [.font: font, .foregroundColor: NSColor.white])
    let sz = s.size()
    s.draw(at: NSPoint(x: cx - sz.width / 2, y: cy - sz.height / 2))
    NSGraphicsContext.restoreGraphicsState()
    try! out.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "staging/icons/\(n).png"))
    print("staging/icons/\(n).png \(Int(W))×\(Int(H))")
}
