from numpy import multiply
from .zabbix_client import ZabbixClient


def get_item_history(hostid, item_filter):
    zabbix = ZabbixClient()

    items = zabbix.call(
        "item.get",
        {
            "hostids": hostid,
            "filter": item_filter,
            "output": ["itemid", "key_"],
        },
    )

    result = {}

    for item in items:
        history = zabbix.call(
            "history.get",
            {
                "itemids": item["itemid"],
                "history": 3,  # numeric unsigned
                "limit": 60,
                "sortfield": "clock",
                "sortorder": "DESC",
            },
        )

        # 🔥 FALLBACK TO TRENDS
        if not history:
            history = zabbix.call(
                "trend.get",
                {
                    "itemids": item["itemid"],
                    "limit": 60,
                    "sortfield": "clock",
                    "sortorder": "DESC",
                },
            )

            # normalize trend format
            history = [
                {"clock": int(h["clock"]), "value": round(float(h.get("value_avg", 0)), 2)}
                for h in history
            ]

        result[item["key_"]] = history[::-1]

    return result

