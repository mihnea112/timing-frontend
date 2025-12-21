import React from "react";
import { Navigate, useParams } from "react-router-dom";

export default function EventResultsPage() {
  const { eventId } = useParams();
  return <Navigate to={`/app/events/${eventId}/timing?tab=results`} replace />;
}