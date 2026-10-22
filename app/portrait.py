class PortraitNotReady(Exception):
    pass


def generate_portrait(_jpeg: bytes) -> bytes:
    raise PortraitNotReady(
        "定妆照模型还没放进这台机器。跟拍可以先看，皮克斯这一步要等 InstantID 的权重组装好。"
    )
