from rest_framework import serializers
from .models import Report, DashboardWidget

class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source='generated_by.username', read_only=True)
    
    class Meta:
        model = Report
        fields = [
            'id', 'name', 'report_type', 'description', 'parameters',
            'file_path', 'generated_by', 'generated_by_name', 'generated_at',
            'is_scheduled', 'schedule_frequency'
        ]
        read_only_fields = ['id', 'generated_at']

class DashboardWidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardWidget
        fields = [
            'id', 'name', 'widget_type', 'title', 'description', 'config',
            'position_x', 'position_y', 'width', 'height', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class SalesReportSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    include_details = serializers.BooleanField(default=False)
    group_by = serializers.ChoiceField(choices=['day', 'week', 'month'], default='day')
    
    def validate(self, attrs):
        if attrs['start_date'] > attrs['end_date']:
            raise serializers.ValidationError("Start date cannot be after end date.")
        return attrs

class InventoryReportSerializer(serializers.Serializer):
    category = serializers.IntegerField(required=False)
    low_stock_only = serializers.BooleanField(default=False)
    out_of_stock_only = serializers.BooleanField(default=False)
    include_inactive = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        if attrs.get('low_stock_only') and attrs.get('out_of_stock_only'):
            raise serializers.ValidationError("Cannot select both low stock and out of stock only.")
        return attrs

class StockMovementReportSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    product = serializers.IntegerField(required=False)
    movement_type = serializers.ChoiceField(
        choices=[('in', 'Stock In'), ('out', 'Stock Out'), ('adjustment', 'Stock Adjustment'), ('return', 'Return')],
        required=False
    )
    
    def validate(self, attrs):
        if attrs['start_date'] > attrs['end_date']:
            raise serializers.ValidationError("Start date cannot be after end date.")
        return attrs
