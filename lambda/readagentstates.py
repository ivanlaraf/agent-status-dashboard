import os
import json
import boto3
from boto3.dynamodb.conditions import Attr
from decimal import Decimal
from datetime import datetime

# Name of thj DynamoDB Table feel free if you want to define it using env variables
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "AgentStates")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


class DecimalEncoder(json.JSONEncoder):
    

    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def parse_time(timestamp: str):
    if not timestamp:
        return None
    try:
        return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except Exception:
        return None


def format_duration(seconds):
    if seconds is None:
        return None
    seconds = int(seconds)
    h, m = divmod(seconds, 3600)
    m, s = divmod(m, 60)
    if h:
        return f"{h}h {m}m {s}s"
    if m:
        return f"{m}m {s}s"
    return f"{s}s"


def lambda_handler(event, context):
    params = event.get("queryStringParameters") or {}
    date = params.get("date")

    try:
        if date:
            resp = table.scan(
                FilterExpression=Attr("timestamp").begins_with(date)
            )
        else:
            resp = table.scan(Limit=200)

        items = resp.get("Items", [])
        items.sort(key=lambda x: x.get("timestamp", ""))

        enriched_items = []
        summary = {}

        grouped = {}
        for item in items:
            agent_id = item.get("AgentId")
            if agent_id:
                grouped.setdefault(agent_id, []).append(item)

        for agent_id, states in grouped.items():
            states.sort(key=lambda x: x.get("timestamp", ""))
            state_counts = {}
            state_durations = {}

            for i, state in enumerate(states):
                start = parse_time(state.get("timestamp"))
                end = parse_time(states[i + 1].get("timestamp")) if i + 1 < len(states) else None

                state["StartTime"] = start.isoformat() if start else None
                state["EndTime"] = end.isoformat() if end else None

                duration_seconds = None
                if start and end:
                    duration_seconds = max((end - start).total_seconds(), 0)
                    state["Duration"] = format_duration(duration_seconds)
                else:
                    state["Duration"] = None

                status = state.get("Status") or state.get("status") or "Unknown"
                agent_name = state.get("AgentName") or state.get("agentName") or "Unknown"

                state_counts[status] = state_counts.get(status, 0) + 1

                if duration_seconds is not None:
                    state_durations[status] = state_durations.get(status, 0) + duration_seconds

                state["AgentName"] = agent_name
                state["Status"] = status

                enriched_items.append(state)

            summary[agent_id] = {
                "agentName": states[0].get("AgentName") or states[0].get("agentName", "Unknown"),
                "stateCounts": state_counts,
                "stateDurations": {k: format_duration(v) for k, v in state_durations.items()}
            }

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"items": enriched_items, "summary": summary}, cls=DecimalEncoder)
        }

    except Exception as e:
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "items": [],
                "summary": {},
                "warning": str(e)
            })
        }
