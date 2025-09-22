import json
import base64
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("AgentStates")

STATUS_MAP = {
    "ROUTABLE": "Available",
    "OFFLINE": "Offline",
    "NOT_ROUTABLE": "AfterCallWork"
}


def lambda_handler(event, context):
    for record in event.get("Records", []):
        try:
            payload_raw = record["kinesis"]["data"]
            payload = base64.b64decode(payload_raw).decode("utf-8")
            detail = json.loads(payload)

            agent_arn = detail.get("AgentARN", "")
            agent_id = agent_arn.split("/")[-1] if agent_arn else "Unknown"

            raw_status = (
                detail.get("CurrentAgentSnapshot", {})
                .get("AgentStatus", {})
                .get("Type", "UNKNOWN")
            )
            agent_status = STATUS_MAP.get(raw_status, raw_status)

            start_time = (
                detail.get("CurrentAgentSnapshot", {})
                .get("AgentStatus", {})
                .get("StartTimestamp", "N/A")
            )

            config = detail.get("CurrentAgentSnapshot", {}).get("Configuration", {})
            first_name = config.get("FirstName", "")
            last_name = config.get("LastName", "")
            agent_name = f"{first_name} {last_name}".strip() or "Unknown"

            timestamp = datetime.utcnow().isoformat()

            item = {
                "AgentId": agent_id,
                "timestamp": timestamp,
                "status": agent_status,
                "startTime": start_time,
                "agentName": agent_name,
            }

            table.put_item(Item=item)

        except Exception as e:
            print(f"Error processing record: {e}")

    return {"statusCode": 200}
