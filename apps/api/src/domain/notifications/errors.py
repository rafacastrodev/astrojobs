class NotificationError(Exception):
    pass


class NotificationConfigurationError(NotificationError):
    pass


class NotificationDeliveryError(NotificationError):
    pass
