import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    let request = VNDetectBarcodesRequest()
    request.usesCPUOnly = true
    request.symbologies = [.qr]
    let handler = VNImageRequestHandler(url: URL(fileURLWithPath: path))
    do {
        try handler.perform([request])
        print(path + ": " + (request.results ?? []).compactMap { $0.payloadStringValue }.joined(separator: ", "))
    } catch { print("ERROR: \(error)") }
}
