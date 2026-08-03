namespace ClockingManagement.Domain.Enums;

public enum VerificationMethod
{
    // Retained only so historical rows can be read and purged safely.
    MockFace = 1,
    FacialRecognition = 2,
    Fingerprint = 3,
    Manual = 4,
    DeviceAuthenticator = 5
}
